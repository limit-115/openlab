import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import {
    FISH_CONFIGURATION_FILE,
    PathEntryMarker,
    ShellStartupFile
} from "#src/lab-installation/path-entry.const";
import {
    putOnWindowsPath,
    takeOffWindowsPath
} from "#src/lab-installation/windows-environment-path";
import { WINDOWS_ENVIRONMENT_KEY } from "#src/lab-installation/windows-environment-path.const";

/** What putting the launcher within reach came to, which is what an uninstall has to undo. */
export interface PathEntryOutcome {
    /** Where the entry was written: a startup file of the operator's, or the registry on Windows. */
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

    /**
     * Windows keeps a user's environment in the registry, and no shell there reads a startup file
     * on the way up. Written the way everything below is written, the entry would land in a file
     * cmd.exe and PowerShell never open, and the operator would be told their `PATH` was seen to.
     */
    if (process.platform === "win32") {
        const changed = await putOnWindowsPath(binDirectory);
        return { written: changed ? [WINDOWS_ENVIRONMENT_KEY] : [], alreadyOnPath: !changed };
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

/** Takes the lab's entry back out of wherever the install put it, leaving the rest untouched. */
export async function removeFromPath(
    binDirectory: string,
    home = homedir()
): Promise<readonly string[]> {
    if (process.platform === "win32") {
        return (await takeOffWindowsPath(binDirectory)) ? [WINDOWS_ENVIRONMENT_KEY] : [];
    }

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
export function isOnPath(
    binDirectory: string,
    environment = process.env,
    platform: NodeJS.Platform = process.platform
): boolean {
    const entries = (environment.PATH ?? "").split(path.delimiter).filter((entry) => entry !== "");
    const wanted = comparably(binDirectory, platform);

    return entries.some((entry) => comparably(entry, platform) === wanted);
}

/**
 * An entry in the form two of them can be compared in.
 *
 * Windows finds a file whatever case its path was asked for in, so a `PATH` holding
 * `C:\\Users\\Ada\\.local\\bin` already reaches a launcher installed at
 * `c:\\users\\ada\\.local\\bin`. Comparing those exactly would have an install write the directory
 * into the registry a second time and tell the operator to open a new terminal for something that
 * already worked. Nowhere else does two cases mean one directory.
 */
function comparably(entry: string, platform: NodeJS.Platform): string {
    const resolved = path.resolve(entry);
    return platform === "win32" ? resolved.toLowerCase() : resolved;
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
