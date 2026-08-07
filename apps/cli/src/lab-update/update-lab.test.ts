import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readlink, rm, stat, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ReleaseManifest } from "@openlab/core/release-channel/release-manifest.types";
import { currentReleaseTarget } from "@openlab/core/release-channel/release-target";
import type { ReleaseTarget } from "@openlab/core/release-channel/release-target.const";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installLab } from "#src/lab-installation/install-lab";
import type { InstallReceipt } from "#src/lab-installation/install-receipt.types";
import { programPaths, versionDirectory } from "#src/lab-installation/installed-layout";
import { UpdateError } from "#src/lab-update/update-error";
import { updateLab } from "#src/lab-update/update-lab";
import { UpdateResult } from "#src/lab-update/update-lab.const";
import { UpdateStep } from "#src/lab-update/update-progress.const";
import type { UpdateProgress } from "#src/lab-update/update-progress.types";

/** Keeps the first of each run of a repeated step, so a download saying so 26 times counts once. */
function unrepeated<T>(value: T, index: number, values: readonly T[]): boolean {
    return values[index - 1] !== value;
}

/** These tests publish a real archive for this machine, so they need a machine with a build. */
function targetOfThisMachine(): ReleaseTarget {
    const target = currentReleaseTarget();
    if (target === undefined) {
        throw new Error(`OpenLab has no build for ${process.platform}-${process.arch}.`);
    }
    return target;
}

const TARGET = targetOfThisMachine();

describe("moving an installed lab to another release", () => {
    let root: string;
    let published: string;
    let server: Server;
    let releasesUrl: string;
    /** What each published version's manifest says, keyed by version, newest published last. */
    const manifests = new Map<string, ReleaseManifest>();
    let latest: string | undefined;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), "openlab-update-"));
        published = path.join(root, "published");
        await mkdir(published, { recursive: true });
        manifests.clear();
        latest = undefined;

        vi.stubEnv("HOME", path.join(root, "home"));
        server = await serve();
        releasesUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        await new Promise((resolve) => server.close(resolve));
        await rm(root, { recursive: true, force: true });
    });

    /** The release layout as it is published: the executable and what it reads, in one archive. */
    async function publish(version: string): Promise<void> {
        const laidOut = path.join(root, `laid-out-${version}`);
        await mkdir(path.join(laidOut, "dashboard"), { recursive: true });
        await writeFile(path.join(laidOut, "openlab"), `openlab ${version}`, "utf8");
        await writeFile(path.join(laidOut, "dashboard", "index.html"), version, "utf8");

        const file = `openlab-${version}-${TARGET}.tar.gz`;
        const archive = path.join(published, file);
        await execa("tar", ["-czf", archive, "-C", laidOut, "."]);

        const bytes = await readFile(archive);
        manifests.set(version, {
            version,
            artifacts: {
                [TARGET]: {
                    file,
                    sha256: createHash("sha256").update(bytes).digest("hex"),
                    size: (await stat(archive)).size
                }
            }
        });
        latest = version;
    }

    /** Serves what a release page serves: a manifest under its tag and under `latest`. */
    function serve(): Promise<Server> {
        const listening = createServer((request, response) => {
            const url = request.url ?? "";
            const latestManifest = latest === undefined ? undefined : manifests.get(latest);

            if (url === "/latest/download/manifest.json" && latestManifest !== undefined) {
                response.writeHead(200).end(JSON.stringify(latestManifest));
                return;
            }
            const named = /^\/download\/v([^/]+)\/(.+)$/.exec(url);
            const manifest = named === undefined ? undefined : manifests.get(named?.[1] ?? "");
            if (named === null || named === undefined || manifest === undefined) {
                response.writeHead(404).end();
                return;
            }
            if (named[2] === "manifest.json") {
                response.writeHead(200).end(JSON.stringify(manifest));
                return;
            }
            readFile(path.join(published, named[2] ?? "")).then(
                (bytes) => response.writeHead(200).end(bytes),
                () => response.writeHead(404).end()
            );
        });
        return new Promise((resolve) => {
            listening.listen(0, "127.0.0.1", () => resolve(listening));
        });
    }

    function environment(): NodeJS.ProcessEnv {
        return {
            OPENLAB_RELEASES_URL: releasesUrl,
            OPENLAB_INSTALL_DIR: path.join(root, "bin")
        };
    }

    /** Puts a lab on disk the way an install would have left it, receipt and launcher included. */
    async function installedAt(version: string): Promise<void> {
        const from = path.join(root, `installed-${version}`);
        await mkdir(path.join(from, "dashboard"), { recursive: true });
        await writeFile(path.join(from, "openlab"), `openlab ${version}`, "utf8");
        await writeFile(path.join(from, "dashboard", "index.html"), version, "utf8");

        await installLab({
            from,
            version,
            paths: programPaths(environment()),
            modifyPath: false,
            platform: "linux"
        });
    }

    function update(
        runningVersion: string,
        options: Partial<Parameters<typeof updateLab>[0]> = {}
    ) {
        return updateLab({
            runningVersion,
            version: undefined,
            check: false,
            prune: true,
            environment: environment(),
            ...options
        });
    }

    /**
     * An update spends minutes on a network, and a terminal that says nothing for a minute cannot
     * be told apart from a hung one. Every step long enough to be waited through says so, and the
     * download says how much of the archive has arrived rather than only that one is arriving.
     */
    it("says what it is doing at every step long enough to be waited through", async () => {
        await installedAt("0.1.0");
        await publish("0.2.0");
        const said: UpdateProgress[] = [];

        await update("0.1.0", { report: (progress) => said.push(progress) });

        expect(said.map((progress) => progress.step).filter(unrepeated)).toEqual([
            UpdateStep.ASKING,
            UpdateStep.DOWNLOADING,
            UpdateStep.UNPACKING,
            UpdateStep.INSTALLING
        ]);
        const downloads = said.filter((progress) => progress.step === UpdateStep.DOWNLOADING);
        expect(downloads.at(-1)?.received).toBe(downloads.at(-1)?.total);
    });

    /** An update has nothing to replace unless this program put the lab there in the first place. */
    it("refuses a lab it did not install", async () => {
        await publish("0.2.0");

        const outcome = await update("0.1.0");

        expect(outcome.result).toBe(UpdateResult.NOT_INSTALLED);
        expect(outcome.offeredVersion).toBeUndefined();
    });

    it("says so when the channel offers what is already running", async () => {
        await installedAt("0.1.0");
        await publish("0.1.0");

        expect((await update("0.1.0")).result).toBe(UpdateResult.ALREADY_CURRENT);
    });

    /** A developer's own build must not be taken away because the channel is behind it. */
    it("leaves a lab ahead of the channel where it is", async () => {
        await installedAt("0.9.0");
        await publish("0.2.0");

        const outcome = await update("0.9.0");

        expect(outcome.result).toBe(UpdateResult.AHEAD_OF_CHANNEL);
        expect(existsSync(versionDirectory(programPaths(environment()), "0.2.0"))).toBe(false);
    });

    it("installs nothing when it was only asked what the channel offers", async () => {
        await installedAt("0.1.0");
        await publish("0.2.0");

        const outcome = await update("0.1.0", { check: true });

        expect(outcome.result).toBe(UpdateResult.AVAILABLE);
        expect(outcome.offeredVersion).toBe("0.2.0");
        expect(existsSync(versionDirectory(programPaths(environment()), "0.2.0"))).toBe(false);
    });

    it("installs the release the channel offers and points the launcher at it", async () => {
        await installedAt("0.1.0");
        await publish("0.2.0");

        const outcome = await update("0.1.0");
        const paths = programPaths(environment());
        const installedVersion = versionDirectory(paths, "0.2.0");

        expect(outcome.result).toBe(UpdateResult.UPDATED);
        expect(await readFile(path.join(installedVersion, "openlab"), "utf8")).toBe(
            "openlab 0.2.0"
        );
        expect(await readlink(paths.launcher)).toBe(path.join(installedVersion, "openlab"));
        const receipt = JSON.parse(await readFile(paths.receipt, "utf8")) as InstallReceipt;
        expect(receipt.version).toBe("0.2.0");
    });

    /**
     * The version an update replaced is what makes a rollback a command rather than a download, so
     * it has to survive the update that replaced it.
     */
    it("keeps the version it replaced", async () => {
        await installedAt("0.1.0");
        await publish("0.2.0");

        const outcome = await update("0.1.0");

        expect(outcome.retired).toEqual([]);
        expect(existsSync(versionDirectory(programPaths(environment()), "0.1.0"))).toBe(true);
    });

    it("deletes the versions older than the one it replaced", async () => {
        await installedAt("0.0.9");
        await installedAt("0.1.0");
        await publish("0.2.0");

        const outcome = await update("0.1.0");

        expect(outcome.retired).toEqual(["0.0.9"]);
        expect(existsSync(versionDirectory(programPaths(environment()), "0.0.9"))).toBe(false);
    });

    it("keeps every version on disk when it was told not to prune", async () => {
        await installedAt("0.0.9");
        await installedAt("0.1.0");
        await publish("0.2.0");

        const outcome = await update("0.1.0", { prune: false });

        expect(outcome.retired).toEqual([]);
        expect(existsSync(versionDirectory(programPaths(environment()), "0.0.9"))).toBe(true);
    });

    /** A release still on disk is a rollback that needs no network at all. */
    it("rolls back to a version on disk without downloading it again", async () => {
        await installedAt("0.1.0");
        await publish("0.2.0");
        await update("0.1.0");
        await new Promise((resolve) => server.close(resolve));

        const outcome = await update("0.2.0", { version: "0.1.0" });

        expect(outcome.result).toBe(UpdateResult.UPDATED);
        expect(outcome.fromDisk).toBe(true);
        expect(await readlink(programPaths(environment()).launcher)).toContain("0.1.0");
    });

    /** Naming a version is taken at its word, including when it goes backwards. */
    it("installs a version an operator named even though it is behind", async () => {
        await installedAt("0.2.0");
        await publish("0.1.0");
        await publish("0.2.0");

        const outcome = await update("0.2.0", { version: "0.1.0" });

        expect(outcome.result).toBe(UpdateResult.UPDATED);
        expect(outcome.offeredVersion).toBe("0.1.0");
    });

    it("says a version the channel never published cannot be installed", async () => {
        await installedAt("0.1.0");
        await publish("0.2.0");

        await expect(update("0.1.0", { version: "9.9.9" })).rejects.toThrow(UpdateError);
    });

    /**
     * The manifest and the archive are separate fetches, so the two disagreeing means one of them
     * is not what the release published. Nothing is installed off it.
     */
    it("installs nothing when the archive is not what the manifest described", async () => {
        await installedAt("0.1.0");
        await publish("0.2.0");
        const artifact = manifests.get("0.2.0")?.artifacts[TARGET];
        await writeFile(path.join(published, artifact?.file ?? ""), "not the release", "utf8");

        await expect(update("0.1.0")).rejects.toThrow(/Checksum mismatch/);
        expect(existsSync(versionDirectory(programPaths(environment()), "0.2.0"))).toBe(false);
    });
});
