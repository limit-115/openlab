import { generateKeyPairSync, sign } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { programPaths, versionDirectory } from "#src/lab-installation/installed-layout";
import { noticeOfNewerRelease } from "#src/lab-update/update-notice";
import { UPDATE_CHECK_INTERVAL_MS } from "#src/lab-update/update-notice.const";
import type { UpdateCheck } from "#src/lab-update/update-notice.types";

const NOW = Date.parse("2026-08-07T12:00:00.000Z");

describe("telling an operator a release they do not have is out", () => {
    let root: string;
    let server: Server;
    let releasesUrl: string;
    let offered: string;
    let asked: number;
    /** The key this invented channel signs with, which a lab is told to trust for the run. */
    const channelKey = generateKeyPairSync("ed25519");
    const channelPublicKey = channelKey.publicKey
        .export({ type: "spki", format: "pem" })
        .toString();

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), "openlab-notice-"));
        vi.stubEnv("HOME", path.join(root, "home"));
        offered = "0.2.0";
        asked = 0;

        server = await new Promise<Server>((resolve) => {
            const listening = createServer((request, response) => {
                const body = JSON.stringify({ version: offered, artifacts: {} });
                if (request.url === "/latest/download/manifest.json") {
                    asked += 1;
                    response.writeHead(200).end(body);
                    return;
                }
                if (request.url === "/latest/download/manifest.json.sig") {
                    const signature = sign(null, Buffer.from(body), channelKey.privateKey);
                    response.writeHead(200).end(`${signature.toString("base64")}\n`);
                    return;
                }
                response.writeHead(404).end();
            });
            listening.listen(0, "127.0.0.1", () => resolve(listening));
        });
        releasesUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        await new Promise((resolve) => server.close(resolve));
        await rm(root, { recursive: true, force: true });
    });

    function environment(): NodeJS.ProcessEnv {
        return { OPENLAB_RELEASES_URL: releasesUrl, OPENLAB_RELEASES_KEY: channelPublicKey };
    }

    /** Only a lab this program installed has a receipt, and only that lab can act on a notice. */
    async function installedAt(version: string): Promise<void> {
        const paths = programPaths(environment());
        await mkdir(paths.home, { recursive: true });
        await writeFile(
            paths.receipt,
            JSON.stringify({
                version,
                installed_at: new Date(NOW).toISOString(),
                version_directory: versionDirectory(paths, version),
                launcher: paths.launcher,
                path_files: []
            }),
            "utf8"
        );
    }

    async function remember(check: UpdateCheck): Promise<void> {
        await writeFile(programPaths(environment()).updateCheck, JSON.stringify(check), "utf8");
    }

    it("names the release and where to read what is in it", async () => {
        await installedAt("0.1.0");

        const notice = await noticeOfNewerRelease("0.1.0", environment(), NOW);

        expect(notice?.offeredVersion).toBe("0.2.0");
        expect(notice?.notesUrl).toBe(`${releasesUrl}/tag/v0.2.0`);
    });

    it("says nothing when the channel offers what is already running", async () => {
        await installedAt("0.2.0");

        expect(await noticeOfNewerRelease("0.2.0", environment(), NOW)).toBeUndefined();
    });

    /** An operator running their own build is past the channel, not behind it. */
    it("says nothing to a lab ahead of the channel", async () => {
        await installedAt("0.9.0");

        expect(await noticeOfNewerRelease("0.9.0", environment(), NOW)).toBeUndefined();
    });

    /** A lab this program did not install cannot act on a notice, so it is not given one. */
    it("says nothing to a lab it did not install", async () => {
        expect(await noticeOfNewerRelease("0.1.0", environment(), NOW)).toBeUndefined();
        expect(asked).toBe(0);
    });

    it("asks the channel once and remembers the answer", async () => {
        await installedAt("0.1.0");

        await noticeOfNewerRelease("0.1.0", environment(), NOW);
        await noticeOfNewerRelease("0.1.0", environment(), NOW + 60_000);

        expect(asked).toBe(1);
        const remembered = JSON.parse(
            await readFile(programPaths(environment()).updateCheck, "utf8")
        ) as UpdateCheck;
        expect(remembered.offered_version).toBe("0.2.0");
    });

    it("asks again once the answer it kept has gone stale", async () => {
        await installedAt("0.1.0");
        await remember({ checked_at: new Date(NOW).toISOString(), offered_version: "0.1.5" });

        const stale = await noticeOfNewerRelease(
            "0.1.0",
            environment(),
            NOW + UPDATE_CHECK_INTERVAL_MS + 1
        );

        expect(asked).toBe(1);
        expect(stale?.offeredVersion).toBe("0.2.0");
    });

    /**
     * Every way this can go wrong ends the same way, because none of them is a reason for a lab not
     * to come up.
     */
    it("says nothing rather than failing when the channel cannot be reached", async () => {
        await installedAt("0.1.0");
        await new Promise((resolve) => server.close(resolve));

        expect(await noticeOfNewerRelease("0.1.0", environment(), NOW)).toBeUndefined();
    });

    it("says nothing rather than failing when it kept an answer it cannot read", async () => {
        await installedAt("0.1.0");
        await writeFile(programPaths(environment()).updateCheck, "this is not a check", "utf8");

        expect((await noticeOfNewerRelease("0.1.0", environment(), NOW))?.offeredVersion).toBe(
            "0.2.0"
        );
    });
});
