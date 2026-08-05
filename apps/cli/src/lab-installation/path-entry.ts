import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
    FISH_CONFIGURATION_FILE,
    PathEntryMarker,
    ShellStartupFile
} from "#src/lab-installation/path-entry.const";

/** What changing an operator's shell startup came to, which is what an uninstall has to undo. */
export interface PathEntryOutcome {
    /** The files a block was written into or refreshed in. */
    readonly written: readonly string[];
    /** True when the directory was already reachable and nothing had to be written at all. */
    readonly alreadyOnPath: boolean;
}

/**
 * Puts the launcher's directory on `PATH` for the next shell the operator opens.
 *
 * A directory that is already reachable is left alone: an operator whose `~/.local/bin` is on
 * `PATH` — which is most of them — gets no edits to any file of theirs, which is the difference
 * between an installer that is polite and one that has to be cleaned up after.
 */
export async function ensureOnPath(
    binDirectory: string,
    environment = process.env,
    home = homedir()
): Promise<PathEntryOutcome> {
    if (isOnPath(binDirectory, environment)) {
        return { written: [], alreadyOnPath: true };
    }

    const written: string[] = [];
    for (const file of Object.values(ShellStartupFile)) {
        const startup = path.join(home, file);
        if (await rewriteBlock(startup, posixBlock(binDirectory), { onlyIfPresent: true })) {
            written.push(startup);
        }
    }

    /* Nothing of the operator's exists to append to on a first install, so one file is made. */
    if (written.length === 0) {
        const profile = path.join(home, ShellStartupFile.PROFILE);
        await rewriteBlock(profile, posixBlock(binDirectory), { onlyIfPresent: false });
        written.push(profile);
    }

    const fish = path.join(home, FISH_CONFIGURATION_FILE);
    if (await rewriteBlock(fish, fishBlock(binDirectory), { onlyIfPresent: true })) {
        written.push(fish);
    }

    return { written, alreadyOnPath: false };
}

/** Takes the lab's block back out of every startup file that has one, leaving the rest untouched. */
export async function removeFromPath(home = homedir()): Promise<readonly string[]> {
    const cleared: string[] = [];
    const candidates = [
        ...Object.values(ShellStartupFile).map((file) => path.join(home, file)),
        path.join(home, FISH_CONFIGURATION_FILE)
    ];

    for (const file of candidates) {
        const existing = await readIfPresent(file);
        if (existing === undefined || !existing.includes(PathEntryMarker.OPENS)) {
            continue;
        }
        await writeFile(file, withoutBlock(existing), "utf8");
        cleared.push(file);
    }
    return cleared;
}

/** Whether a directory is already somewhere the shell would find the launcher. */
export function isOnPath(binDirectory: string, environment = process.env): boolean {
    const entries = (environment.PATH ?? "").split(path.delimiter).filter((entry) => entry !== "");
    return entries.some((entry) => path.resolve(entry) === path.resolve(binDirectory));
}

/**
 * Writes the lab's block into a file, replacing an older one rather than stacking another beneath
 * it. Returns whether the file was touched at all.
 */
async function rewriteBlock(
    file: string,
    block: string,
    { onlyIfPresent }: { onlyIfPresent: boolean }
): Promise<boolean> {
    const existing = await readIfPresent(file);
    if (existing === undefined && onlyIfPresent) {
        return false;
    }

    const kept = withoutBlock(existing ?? "");
    const separated = kept === "" || kept.endsWith("\n") ? kept : `${kept}\n`;
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `${separated}${block}`, "utf8");
    return true;
}

function withoutBlock(contents: string): string {
    const opens = contents.indexOf(PathEntryMarker.OPENS);
    if (opens === -1) {
        return contents;
    }
    const closes = contents.indexOf(PathEntryMarker.CLOSES, opens);
    if (closes === -1) {
        return contents.slice(0, opens);
    }
    return contents.slice(0, opens) + contents.slice(closes + PathEntryMarker.CLOSES.length + 1);
}

/** The directory is put in front so that a lab installed here is the one that answers. */
function posixBlock(binDirectory: string): string {
    return [
        PathEntryMarker.OPENS,
        `case ":$PATH:" in *":${binDirectory}:"*) ;; *) export PATH="${binDirectory}:$PATH" ;; esac`,
        PathEntryMarker.CLOSES,
        ""
    ].join("\n");
}

function fishBlock(binDirectory: string): string {
    return [
        PathEntryMarker.OPENS,
        `if not contains "${binDirectory}" $PATH`,
        `    set -gx PATH "${binDirectory}" $PATH`,
        "end",
        PathEntryMarker.CLOSES,
        ""
    ].join("\n");
}

async function readIfPresent(file: string): Promise<string | undefined> {
    try {
        return await readFile(file, "utf8");
    } catch {
        return undefined;
    }
}
