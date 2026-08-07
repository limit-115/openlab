import { open, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { UPDATE_LOCK_FILE } from "#src/lab-update/one-update-at-a-time.const";
import { UpdateError } from "#src/lab-update/update-error";

/** Takes the lock back. Calling it twice is what a `finally` does on a path that already released. */
export type ReleaseUpdateLock = () => Promise<void>;

/**
 * Lets one update at a time lay a release out.
 *
 * Two updates share the two scratch directories a version swap goes through, so running them at
 * once means each renaming the other's half-copied release into place. The file is created with
 * the flag that fails when it is already there, which is one filesystem operation and is atomic on
 * every platform a release is built for — no window between asking and taking.
 *
 * An update killed partway leaves its lock behind, so the lock says which process holds it and a
 * process that is no longer running does not hold anything. That is what keeps a crash from
 * wedging the command until somebody works out which file to delete.
 */
export async function holdUpdateLock(home: string): Promise<ReleaseUpdateLock> {
    const lock = path.join(home, UPDATE_LOCK_FILE);

    try {
        await take(lock);
    } catch (error) {
        if (!isAlreadyHeld(error)) {
            throw error;
        }
        if (stillRunning(await holder(lock))) {
            throw new UpdateError(
                `Another update is already running. Wait for it, or delete ${lock} if nothing is.`
            );
        }
        await rm(lock, { force: true });
        await take(lock);
    }

    return async () => {
        await rm(lock, { force: true });
    };
}

/** Creates the lock, or fails because somebody else already did. */
async function take(lock: string): Promise<void> {
    const held = await open(lock, "wx");
    try {
        await held.writeFile(`${process.pid}\n`, "utf8");
    } finally {
        await held.close();
    }
}

/** Which process took the lock, or nothing when the file says nothing a process could be. */
async function holder(lock: string): Promise<number | undefined> {
    const written = Number.parseInt(await readFile(lock, "utf8").catch(() => ""), 10);
    return Number.isInteger(written) && written > 0 ? written : undefined;
}

/**
 * Whether the process that took the lock is still there.
 *
 * Signal zero asks the operating system that question without sending anything. A process that
 * belongs to somebody else answers that it exists, which is the safe way to be wrong: the update
 * says another one is running rather than helping itself to a lock somebody holds.
 */
function stillRunning(pid: number | undefined): boolean {
    if (pid === undefined) {
        return false;
    }
    try {
        process.kill(pid, 0);
        return true;
    } catch (error) {
        return (error as NodeJS.ErrnoException).code === "EPERM";
    }
}

function isAlreadyHeld(error: unknown): boolean {
    return (error as NodeJS.ErrnoException).code === "EEXIST";
}
