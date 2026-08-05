import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureOnPath, isOnPath, removeFromPath } from "#src/lab-installation/path-entry";
import {
    FISH_CONFIGURATION_FILE,
    PathEntryMarker,
    ShellStartupFile
} from "#src/lab-installation/path-entry.const";

const BIN = "/opt/nightlab/bin";
const ELSEWHERE = { PATH: "/usr/bin:/bin" };

describe("putting the launcher's directory on PATH", () => {
    let home: string;

    beforeEach(async () => {
        home = await mkdtemp(path.join(tmpdir(), "nightlab-home-"));
    });

    afterEach(async () => {
        await rm(home, { recursive: true, force: true });
    });

    async function startupFile(name: string): Promise<string> {
        return readFile(path.join(home, name), "utf8");
    }

    /** An operator whose directory is already reachable should get no edits to any file of theirs. */
    it("writes nothing when the directory is already reachable", async () => {
        const outcome = await ensureOnPath(BIN, { PATH: `/usr/bin:${BIN}` }, home);

        expect(outcome).toEqual({ written: [], alreadyOnPath: true });
    });

    it("writes only into the startup files the operator already has", async () => {
        await writeFile(path.join(home, ShellStartupFile.ZSH_RC), "# mine\n", "utf8");

        const outcome = await ensureOnPath(BIN, ELSEWHERE, home);

        expect(outcome.written).toEqual([path.join(home, ShellStartupFile.ZSH_RC)]);
        expect(await startupFile(ShellStartupFile.ZSH_RC)).toContain("# mine");
        await expect(startupFile(ShellStartupFile.BASH_RC)).rejects.toThrow();
    });

    /** With nothing of the operator's to append to, one file has to be made or the launcher is lost. */
    it("makes a profile when the operator has no startup file at all", async () => {
        const outcome = await ensureOnPath(BIN, ELSEWHERE, home);

        expect(outcome.written).toEqual([path.join(home, ShellStartupFile.PROFILE)]);
        expect(await startupFile(ShellStartupFile.PROFILE)).toContain(BIN);
    });

    /** Installing twice must not stack a second block on top of the first. */
    it("replaces its own block instead of appending another", async () => {
        await writeFile(path.join(home, ShellStartupFile.ZSH_RC), "# mine\n", "utf8");
        await ensureOnPath(BIN, ELSEWHERE, home);
        await ensureOnPath("/somewhere/else/bin", ELSEWHERE, home);

        const contents = await startupFile(ShellStartupFile.ZSH_RC);
        expect(contents.split(PathEntryMarker.OPENS)).toHaveLength(2);
        expect(contents).toContain("/somewhere/else/bin");
        expect(contents).not.toContain(BIN);
        expect(contents).toContain("# mine");
    });

    it("writes fish its own syntax in the directory fish reads", async () => {
        await mkdir(path.dirname(path.join(home, FISH_CONFIGURATION_FILE)), { recursive: true });
        await writeFile(path.join(home, FISH_CONFIGURATION_FILE), "", "utf8");

        await ensureOnPath(BIN, ELSEWHERE, home);

        expect(await startupFile(FISH_CONFIGURATION_FILE)).toContain(`set -gx PATH "${BIN}"`);
    });
});

describe("taking the launcher's directory back off PATH", () => {
    let home: string;

    beforeEach(async () => {
        home = await mkdtemp(path.join(tmpdir(), "nightlab-home-"));
    });

    afterEach(async () => {
        await rm(home, { recursive: true, force: true });
    });

    /** What the operator wrote themselves has to survive an uninstall exactly as they left it. */
    it("leaves everything the operator wrote themselves", async () => {
        const own = "# mine\nexport EDITOR=vim\n";
        await writeFile(path.join(home, ShellStartupFile.ZSH_RC), own, "utf8");
        await ensureOnPath(BIN, ELSEWHERE, home);

        const cleared = await removeFromPath(home);

        expect(cleared).toEqual([path.join(home, ShellStartupFile.ZSH_RC)]);
        expect(await readFile(path.join(home, ShellStartupFile.ZSH_RC), "utf8")).toBe(own);
    });

    it("passes over a file the lab never wrote into", async () => {
        await writeFile(path.join(home, ShellStartupFile.BASH_RC), "# mine\n", "utf8");

        expect(await removeFromPath(home)).toEqual([]);
    });
});

describe("isOnPath", () => {
    it("recognises the same directory written differently", () => {
        expect(isOnPath("/opt/lab/bin", { PATH: "/usr/bin:/opt/lab/../lab/bin" })).toBe(true);
    });

    it("does not mistake a directory that merely starts the same way", () => {
        expect(isOnPath("/opt/lab/bin", { PATH: "/opt/lab/bin-old" })).toBe(false);
    });
});
