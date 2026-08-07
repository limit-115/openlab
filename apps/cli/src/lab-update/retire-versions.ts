import { realpathSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";

/**
 * The version directory this process is running out of, when it is running out of one at all.
 *
 * An executable resolves its own path through the launcher symlink, so a lab started as `openlab`
 * reports the version directory it actually came from rather than the launcher that pointed at it.
 * A lab run from its sources is running out of no version directory, and answers nothing.
 *
 * Both sides are resolved before they are compared, because only one of them arrives resolved. An
 * operator whose home is reached through a symlink — which is every macOS temporary directory and
 * plenty of managed machines — would otherwise have the running lab match nothing here, and a
 * prune would then delete the directory that lab is still reading its dashboard out of.
 */
export function runningVersion(
    versionsDirectory: string,
    executable: string = process.execPath
): string | undefined {
    const directory = path.dirname(resolved(executable));
    return path.dirname(directory) === resolved(versionsDirectory)
        ? path.basename(directory)
        : undefined;
}

/** A path with every symlink along it resolved, or the path itself when there is nothing there. */
function resolved(entry: string): string {
    try {
        return realpathSync(entry);
    } catch {
        return path.resolve(entry);
    }
}

/**
 * Deletes the versions no longer worth the disk they take.
 *
 * A version directory is a whole release and a release is tens of megabytes, so updating cannot
 * simply leave them all behind. What is kept is the version now answering and the one before it,
 * which is what makes a rollback a command rather than a download.
 *
 * Nothing a running lab reads out of is removed. A lab finds its dashboard and its migrations
 * beside the executable it resolved when it started, so deleting the directory it started from
 * takes both away from a lab still serving them.
 */
export async function retireVersions(
    versionsDirectory: string,
    keep: readonly (string | undefined)[]
): Promise<readonly string[]> {
    const kept = new Set(keep.filter((version) => version !== undefined));
    const entries = await readdir(versionsDirectory, { withFileTypes: true }).catch(() => []);

    const retired = entries
        .filter((entry) => entry.isDirectory() && !kept.has(entry.name))
        .map((entry) => entry.name);

    for (const version of retired) {
        await rm(path.join(versionsDirectory, version), { recursive: true, force: true });
    }
    return retired;
}
