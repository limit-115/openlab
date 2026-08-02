import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EXECUTION_STATUS } from "#src/constants";
import { ArtifactDirectoryExistsError } from "#src/errors";
import { runExperiment } from "#src/run";

const temporaryRoots: string[] = [];

afterEach(async () => {
    await Promise.all(
        temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
    );
});

describe("runExperiment", () => {
    it("executes argv without a shell and persists inputs, outputs, metadata, and hashes", async () => {
        const root = await temporaryRoot();
        const artifactDirectory = join(root, "attempt-1");
        const input = "evidence input";
        const suspiciousArgument = "value; echo this-is-not-a-second-command";

        const result = await runExperiment({
            file: process.execPath,
            args: [
                "-e",
                "process.stdin.on('data', chunk => process.stdout.write(chunk)); console.error(process.argv[1])",
                suspiciousArgument
            ],
            cwd: root,
            artifactDirectory,
            input,
            env: { LAB_TEST_SECRET: "do-not-persist-this-value" }
        });

        const stdout = await readFile(result.stdout.path, "utf8");
        const stderr = await readFile(result.stderr.path, "utf8");
        const manifest = await readFile(result.manifest.path, "utf8");

        expect(result.status).toBe(EXECUTION_STATUS.SUCCEEDED);
        expect(result.exitCode).toBe(0);
        expect(result.command.shell).toBe(false);
        expect(stdout).toBe(input);
        expect(stderr).toContain(suspiciousArgument);
        expect(result.stdout.sha256).toBe(sha256(stdout));
        expect(result.stderr.sha256).toBe(sha256(stderr));
        expect(result.input).toMatchObject({
            bytes: Buffer.byteLength(input),
            sha256: sha256(input)
        });
        expect(manifest).not.toContain("do-not-persist-this-value");
        expect(JSON.parse(manifest)).toMatchObject({
            status: EXECUTION_STATUS.SUCCEEDED,
            command: {
                file: process.execPath,
                args: expect.arrayContaining([suspiciousArgument]),
                shell: false
            },
            environment: {
                overrides: {
                    LAB_TEST_SECRET: { sha256: sha256("do-not-persist-this-value") }
                }
            }
        });
    });

    it("retains stdout and stderr when a command exits unsuccessfully", async () => {
        const root = await temporaryRoot();

        const result = await runExperiment({
            file: process.execPath,
            args: [
                "-e",
                "process.stdout.write('partial result'); process.stderr.write('failure details'); process.exit(7)"
            ],
            cwd: root,
            artifactDirectory: join(root, "failed-attempt")
        });

        expect(result).toMatchObject({ status: EXECUTION_STATUS.FAILED, exitCode: 7 });
        await expect(readFile(result.stdout.path, "utf8")).resolves.toBe("partial result");
        await expect(readFile(result.stderr.path, "utf8")).resolves.toBe("failure details");
    });

    it("retains partial artifacts and marks a timed-out command", async () => {
        const root = await temporaryRoot();

        const result = await runExperiment({
            file: process.execPath,
            args: ["-e", "process.stdout.write('before timeout'); setInterval(() => {}, 1_000)"],
            cwd: root,
            artifactDirectory: join(root, "timed-out-attempt"),
            timeoutMs: 100,
            forceKillAfterMs: 100
        });

        expect(result.status).toBe(EXECUTION_STATUS.TIMED_OUT);
        await expect(readFile(result.stdout.path, "utf8")).resolves.toBe("before timeout");
    });

    it("writes a running manifest before completion and records external cancellation", async () => {
        const root = await temporaryRoot();
        const artifactDirectory = join(root, "cancelled-attempt");
        const manifestPath = join(artifactDirectory, "execution.json");
        const stdoutPath = join(artifactDirectory, "stdout.log");
        const controller = new AbortController();
        const execution = runExperiment(
            {
                file: process.execPath,
                args: ["-e", "process.stdout.write('started'); setInterval(() => {}, 1_000)"],
                cwd: root,
                artifactDirectory,
                forceKillAfterMs: 100
            },
            controller.signal
        );

        await vi.waitFor(async () => {
            await expect(readFile(stdoutPath, "utf8")).resolves.toBe("started");
        });
        const runningManifest = JSON.parse(await readFile(manifestPath, "utf8"));
        expect(runningManifest.status).toBe(EXECUTION_STATUS.RUNNING);
        controller.abort(new Error("test cancellation"));

        const result = await execution;
        expect(result.status).toBe(EXECUTION_STATUS.CANCELLED);
        await expect(readFile(result.stdout.path, "utf8")).resolves.toBe("started");
    });

    it("records spawn errors instead of losing the attempt", async () => {
        const root = await temporaryRoot();

        const result = await runExperiment({
            file: join(root, "missing-executable"),
            cwd: root,
            artifactDirectory: join(root, "spawn-error")
        });

        expect(result.status).toBe(EXECUTION_STATUS.SPAWN_ERROR);
        expect(result.exitCode).toBeNull();
        expect(result.error).toContain("missing-executable");
        expect(result.stdout.bytes).toBe(0);
        expect(result.stderr.bytes).toBe(0);
    });

    it("requires explicit shell opt-in and records it", async () => {
        const root = await temporaryRoot();

        const result = await runExperiment({
            file: "printf",
            args: ["shell-output"],
            cwd: root,
            artifactDirectory: join(root, "shell-attempt"),
            shell: { enabled: true }
        });

        expect(result.status).toBe(EXECUTION_STATUS.SUCCEEDED);
        expect(result.command.shell).toEqual({ executable: null });
        await expect(readFile(result.stdout.path, "utf8")).resolves.toBe("shell-output");
    });

    it("refuses to overwrite an existing attempt directory", async () => {
        const root = await temporaryRoot();
        const artifactDirectory = join(root, "existing-attempt");
        await mkdir(artifactDirectory);

        await expect(
            runExperiment({
                file: process.execPath,
                args: ["--version"],
                cwd: root,
                artifactDirectory
            })
        ).rejects.toBeInstanceOf(ArtifactDirectoryExistsError);
    });
});

async function temporaryRoot(): Promise<string> {
    const path = await mkdtemp(join(tmpdir(), "lab-executor-"));
    temporaryRoots.push(path);
    return path;
}

function sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}
