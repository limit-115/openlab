import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { holdUpdateLock } from "#src/lab-update/one-update-at-a-time";
import { UPDATE_LOCK_FILE } from "#src/lab-update/one-update-at-a-time.const";
import { UpdateError } from "#src/lab-update/update-error";

describe("letting one update at a time lay a release out", () => {
    let home: string;

    beforeEach(async () => {
        home = await mkdtemp(path.join(tmpdir(), "openlab-lock-"));
    });

    afterEach(async () => {
        await rm(home, { recursive: true, force: true });
    });

    function lockFile(): string {
        return path.join(home, UPDATE_LOCK_FILE);
    }

    /**
     * Two updates lay their releases out through the same two scratch directories, so the second
     * one has to be told rather than allowed to rename the first one's half-copied release on.
     */
    it("refuses a second update while the first still holds it", async () => {
        const release = await holdUpdateLock(home);

        await expect(holdUpdateLock(home)).rejects.toThrow(UpdateError);
        await release();
    });

    it("lets the next update through once the first has finished", async () => {
        await (await holdUpdateLock(home))();

        const release = await holdUpdateLock(home);

        expect(existsSync(lockFile())).toBe(true);
        await release();
        expect(existsSync(lockFile())).toBe(false);
    });

    /** An update killed partway must not wedge the command until somebody deletes a file. */
    it("takes over a lock whose process is gone", async () => {
        const finished = execa("node", ["-e", ""]);
        const gone = finished.pid;
        await finished;
        await writeFile(lockFile(), `${gone}\n`, "utf8");

        const release = await holdUpdateLock(home);

        expect(Number.parseInt(await readFile(lockFile(), "utf8"), 10)).toBe(process.pid);
        await release();
    });

    /** A lock that says nothing a process could be is a lock nobody can be shown to hold. */
    it("takes over a lock that names no process at all", async () => {
        await writeFile(lockFile(), "killed before it wrote anything", "utf8");

        const release = await holdUpdateLock(home);

        expect(Number.parseInt(await readFile(lockFile(), "utf8"), 10)).toBe(process.pid);
        await release();
    });

    /** The lock names who holds it, because that is the only reason it can be taken over safely. */
    it("says which process holds it", async () => {
        const release = await holdUpdateLock(home);

        expect(Number.parseInt(await readFile(lockFile(), "utf8"), 10)).toBe(process.pid);
        await release();
    });
});
