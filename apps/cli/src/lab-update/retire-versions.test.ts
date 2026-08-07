import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { retireVersions, runningVersion } from "#src/lab-update/retire-versions";

describe("the version a lab is running out of", () => {
    let root: string;
    let versions: string;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), "openlab-versions-"));
        versions = path.join(root, "versions");
        await mkdir(path.join(versions, "0.1.0"), { recursive: true });
        await mkdir(path.join(root, "bin"), { recursive: true });
        await writeFile(path.join(versions, "0.1.0", "openlab"), "", "utf8");
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    /**
     * The whole of an update being safe underneath a running lab rests on this: an executable
     * started through the launcher resolves to the version directory it actually came from, so the
     * launcher can be pointed elsewhere without moving what is already running.
     */
    it("is the directory the launcher resolved to, not the launcher", async () => {
        const launcher = path.join(root, "bin", "openlab");
        await symlink(path.join(versions, "0.1.0", "openlab"), launcher);

        expect(runningVersion(versions, launcher)).toBe("0.1.0");
    });

    /** A lab run from its sources is running out of no version directory and must claim none. */
    it("is nothing when the executable is not a version of this lab", () => {
        expect(runningVersion(versions, process.execPath)).toBeUndefined();
    });
});

describe("taking back the disk an update no longer needs", () => {
    let versions: string;

    beforeEach(async () => {
        versions = await mkdtemp(path.join(tmpdir(), "openlab-retire-"));
        for (const version of ["0.0.8", "0.0.9", "0.1.0", "0.2.0"]) {
            await mkdir(path.join(versions, version), { recursive: true });
        }
    });

    afterEach(async () => {
        await rm(versions, { recursive: true, force: true });
    });

    it("deletes every version it was not told to keep", async () => {
        const retired = await retireVersions(versions, ["0.2.0", "0.1.0"]);

        expect(retired.toSorted()).toEqual(["0.0.8", "0.0.9"]);
    });

    /** A lab run from its sources contributes no version to keep, and must not delete everything. */
    it("passes over the versions it was told about among nothing", async () => {
        const retired = await retireVersions(versions, ["0.2.0", undefined, undefined]);

        expect(retired).not.toContain("0.2.0");
        expect(retired).toHaveLength(3);
    });

    /** An update that scattered scratch across a crash is the only thing left to clean up. */
    it("takes the scratch of an earlier install with it", async () => {
        await mkdir(path.join(versions, "0.2.0.incoming"), { recursive: true });

        expect(await retireVersions(versions, ["0.2.0"])).toContain("0.2.0.incoming");
    });

    it("says nothing was retired when a lab has only what it needs", async () => {
        expect(await retireVersions(versions, ["0.0.8", "0.0.9", "0.1.0", "0.2.0"])).toEqual([]);
    });
});
