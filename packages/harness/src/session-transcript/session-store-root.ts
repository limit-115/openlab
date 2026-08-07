import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { DAY_PARTITION_DEPTH } from "#src/session-transcript/session-transcript.const";

/**
 * The directory a CLI will resolve for itself, read out of the very environment the run was spawned
 * with. Reading it from anywhere else would let the lab copy one store while the CLI wrote to
 * another: the harness strips and rewrites the environment before every run, so the operator's shell
 * and the spawned process do not always agree on where a home is.
 */
export function sessionStoreRoot(
    environment: Readonly<Record<string, string>>,
    variable: string,
    fallbackSegments: readonly string[]
): string {
    const configured = environment[variable];
    if (configured !== undefined && configured !== "") {
        return resolve(configured);
    }
    return join(environment.HOME ?? homedir(), ...fallbackSegments);
}

/**
 * The entries a CLI filed under its own year/month/day partitioning. The walk stops at the day
 * directory: a session's own contents can run to tens of thousands of files, and descending into
 * every session ever recorded to find one of them would cost more than the run it belongs to.
 *
 * A store that is not there yields nothing rather than raising, so a missing store and an empty one
 * are told apart by the caller that knows which it is looking at.
 */
export async function dayPartitionEntries(sessionsDirectory: string): Promise<readonly Dirent[]> {
    let directories = [sessionsDirectory];
    for (let depth = 0; depth < DAY_PARTITION_DEPTH; depth += 1) {
        const next: string[] = [];
        for (const directory of directories) {
            for (const entry of await directoryEntries(directory)) {
                if (entry.isDirectory()) {
                    next.push(join(directory, entry.name));
                }
            }
        }
        directories = next;
    }

    const entries: Dirent[] = [];
    for (const directory of directories) {
        entries.push(...(await directoryEntries(directory)));
    }
    return entries;
}

export async function directoryEntries(directory: string): Promise<readonly Dirent[]> {
    try {
        return await readdir(directory, { withFileTypes: true });
    } catch (error) {
        if (isMissingEntry(error)) {
            return [];
        }
        throw error;
    }
}

function isMissingEntry(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
}
