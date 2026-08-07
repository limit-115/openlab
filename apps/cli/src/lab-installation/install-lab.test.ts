import { mkdir, mkdtemp, readdir, readFile, readlink, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installLab } from "#src/lab-installation/install-lab";
import type { InstallReceipt } from "#src/lab-installation/install-receipt.types";
import type { ProgramPaths } from "#src/lab-installation/installed-layout";

const VERSION = "0.1.0";

describe("installing the release an executable came from", () => {
    let root: string;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), "openlab-install-"));
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    /** A release as it arrives: the executable and the directories it reads, in one directory. */
    async function releaseOf(marker: string): Promise<string> {
        const from = path.join(root, `release-${marker}`);
        await mkdir(path.join(from, "dashboard"), { recursive: true });
        await writeFile(path.join(from, "openlab"), marker, "utf8");
        await writeFile(path.join(from, "dashboard", "index.html"), marker, "utf8");
        return from;
    }

    function pathsFor(): ProgramPaths {
        const home = path.join(root, "openlab");
        const binDirectory = path.join(root, "bin");
        return {
            home,
            versions: path.join(home, "versions"),
            binDirectory,
            launcher: path.join(binDirectory, "openlab"),
            receipt: path.join(home, "install-receipt.json"),
            updateCheck: path.join(home, "update-check.json")
        };
    }

    async function install(from: string, version = VERSION, platform: NodeJS.Platform = "linux") {
        return installLab({ from, version, paths: pathsFor(), modifyPath: false, platform });
    }

    it("lays the whole release out under the version it is", async () => {
        const outcome = await install(await releaseOf("first"));

        expect(await readFile(path.join(outcome.versionDirectory, "openlab"), "utf8")).toBe(
            "first"
        );
        expect(
            await readFile(path.join(outcome.versionDirectory, "dashboard", "index.html"), "utf8")
        ).toBe("first");
    });

    /**
     * The swap replaces a release rather than writing over it, so nothing a previous one shipped
     * can survive into the next. A dashboard file left behind would be served by a version that
     * never contained it.
     */
    it("replaces a release already there instead of merging into it", async () => {
        const first = await releaseOf("first");
        await writeFile(path.join(first, "dashboard", "gone-next-time.html"), "stale", "utf8");
        await install(first);

        const outcome = await install(await releaseOf("second"));

        expect(await readdir(path.join(outcome.versionDirectory, "dashboard"))).toEqual([
            "index.html"
        ]);
        expect(await readFile(path.join(outcome.versionDirectory, "openlab"), "utf8")).toBe(
            "second"
        );
    });

    /** The scratch directories the swap needs are the swap's business and nobody else's. */
    it("leaves no scratch directory beside the version", async () => {
        await install(await releaseOf("first"));
        const outcome = await install(await releaseOf("second"));

        expect(await readdir(path.dirname(outcome.versionDirectory))).toEqual([VERSION]);
    });

    /** An install killed partway leaves scratch behind, and the next one has to install anyway. */
    it("installs over scratch an earlier run left behind", async () => {
        const paths = pathsFor();
        await mkdir(`${path.join(paths.versions, VERSION)}.incoming`, { recursive: true });
        await mkdir(`${path.join(paths.versions, VERSION)}.outgoing`, { recursive: true });
        await writeFile(
            path.join(`${path.join(paths.versions, VERSION)}.incoming`, "junk"),
            "junk",
            "utf8"
        );

        const outcome = await install(await releaseOf("first"));

        expect((await readdir(outcome.versionDirectory)).sort()).toEqual(["dashboard", "openlab"]);
        expect(await readdir(path.dirname(outcome.versionDirectory))).toEqual([VERSION]);
    });

    /** What makes a version swap instant everywhere the launcher is already reachable. */
    it("points the launcher at the executable inside the version", async () => {
        const outcome = await install(await releaseOf("first"));

        expect(await readlink(outcome.launcher)).toBe(
            path.join(outcome.versionDirectory, "openlab")
        );
    });

    /** Windows grants symlinks to a developer mode an install may not assume it has. */
    it("hands over through a script where Windows would refuse a symlink", async () => {
        const outcome = await install(await releaseOf("first"), VERSION, "win32");

        expect(await readFile(outcome.launcher, "utf8")).toContain(
            path.join(outcome.versionDirectory, "openlab.exe")
        );
    });

    /** An uninstall reads this rather than working out again where the launcher went. */
    it("records the launcher and the version directory an uninstall will need", async () => {
        const outcome = await install(await releaseOf("first"));

        const receipt = JSON.parse(await readFile(pathsFor().receipt, "utf8")) as InstallReceipt;
        expect(receipt.version).toBe(VERSION);
        expect(receipt.version_directory).toBe(outcome.versionDirectory);
        expect(receipt.launcher).toBe(outcome.launcher);
    });

    /** An operator who manages their own PATH is not to be written to, and not to be lied to. */
    it("reports no PATH files when it was told to leave PATH alone", async () => {
        const outcome = await install(await releaseOf("first"));

        expect(outcome.pathFiles).toEqual([]);
        expect(outcome.alreadyOnPath).toBe(false);
    });
});
