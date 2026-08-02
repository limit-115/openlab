import { createHash } from "node:crypto";
import { mkdtemp, readFile, realpath } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDaemonSource } from "#src/source-integrity/source-fetch";
import { SourceFetchLimits, SourceFetchOutcome } from "#src/source-integrity/source-fetch.contract";

const SourceFixture = {
    BODY: "official source body"
} as const;

describe("fetchDaemonSource", () => {
    afterEach(() => vi.restoreAllMocks());

    it("records a contained body, hash, final URL, status, and timestamp", async () => {
        const server = await startSourceServer();
        const root = await mkdtemp(path.join(tmpdir(), "lab-source-fetch-"));
        try {
            const result = await fetchDaemonSource({
                url: `${server.baseUrl}/redirect`,
                artifactDirectory: path.join(root, "fetch-1")
            });

            expect(result).toMatchObject({
                outcome: SourceFetchOutcome.SUCCEEDED,
                requestedUrl: `${server.baseUrl}/redirect`,
                finalUrl: `${server.baseUrl}/source`,
                httpStatus: 200,
                fetchedAt: expect.any(String)
            });
            if (result.outcome !== SourceFetchOutcome.SUCCEEDED) {
                throw new Error("Expected a successful source fetch");
            }
            expect(result.body.path.startsWith(await realpath(root))).toBe(true);
            expect(result.body.sha256).toBe(
                createHash("sha256").update(SourceFixture.BODY).digest("hex")
            );
            await expect(readFile(result.body.path, "utf8")).resolves.toBe(SourceFixture.BODY);
            const manifest = JSON.parse(await readFile(result.manifest.path, "utf8"));
            expect(manifest).toMatchObject({
                outcome: SourceFetchOutcome.SUCCEEDED,
                final_url: `${server.baseUrl}/source`,
                http_status: 200,
                body: { sha256: result.body.sha256 }
            });
        } finally {
            await server.close();
        }
    });

    it("persists a negative manifest for 404 and oversized responses", async () => {
        const server = await startSourceServer();
        const root = await mkdtemp(path.join(tmpdir(), "lab-source-rejection-"));
        try {
            const missing = await fetchDaemonSource({
                url: `${server.baseUrl}/missing`,
                artifactDirectory: path.join(root, "missing")
            });
            expect(missing).toMatchObject({
                outcome: SourceFetchOutcome.REJECTED,
                httpStatus: 404,
                error: "Source fetch returned HTTP 404",
                manifest: { path: expect.any(String), sha256: expect.any(String) }
            });

            const oversized = await fetchDaemonSource({
                url: `${server.baseUrl}/oversized`,
                artifactDirectory: path.join(root, "oversized")
            });
            expect(oversized).toMatchObject({
                outcome: SourceFetchOutcome.REJECTED,
                error: "Source response exceeds the body size limit"
            });
        } finally {
            await server.close();
        }
    });

    it("rejects an unparsable URL before issuing a request", async () => {
        const fetchSpy = vi
            .spyOn(globalThis, "fetch")
            .mockRejectedValue(new Error("Unexpected network request"));
        const root = await mkdtemp(path.join(tmpdir(), "lab-source-invalid-"));

        const invalid = await fetchDaemonSource({
            url: "fabricated source URL",
            artifactDirectory: path.join(root, "invalid")
        });
        expect(invalid).toMatchObject({
            outcome: SourceFetchOutcome.REJECTED,
            requestedUrl: "[invalid-url]",
            error: "Source URL is invalid"
        });
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

async function startSourceServer(): Promise<{
    baseUrl: string;
    close: () => Promise<void>;
}> {
    const server = createServer((request, response) => {
        switch (request.url) {
            case "/source":
                response.writeHead(200, {
                    "content-type": "text/plain",
                    "content-length": Buffer.byteLength(SourceFixture.BODY)
                });
                response.end(SourceFixture.BODY);
                return;
            case "/redirect":
                response.writeHead(302, { location: "/source" });
                response.end();
                return;
            case "/oversized":
                response.writeHead(200, {
                    "content-length": SourceFetchLimits.MAXIMUM_BODY_BYTES + 1
                });
                response.end("too large");
                return;
            default:
                response.writeHead(404);
                response.end("missing");
        }
    });
    await listen(server);
    const address = server.address();
    if (address === null || typeof address === "string") {
        throw new Error("Local source server did not bind a TCP address");
    }
    return {
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => close(server)
    };
}

function listen(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            resolve();
        });
    });
}

function close(server: Server): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
    });
}
