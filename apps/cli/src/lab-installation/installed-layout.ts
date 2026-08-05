import { homedir } from "node:os";
import path from "node:path";
import { InstallEnvironment, InstalledLayout } from "#src/lab-installation/installed-layout.const";

/** Everywhere one installation touches, worked out from the operator's environment. */
export interface InstalledPaths {
    /** The program's home, holding every version. */
    readonly home: string;
    /** Where this version's release is unpacked to. */
    readonly version: string;
    /** The directory the launcher goes in, which is the one that has to be on `PATH`. */
    readonly binDirectory: string;
    /** The launcher itself: what an operator types, pointing at the version that answers it. */
    readonly launcher: string;
    /** Where the receipt of this installation is kept. */
    readonly receipt: string;
}

/**
 * Where a given version installs to.
 *
 * A directory named after the version is what makes an installation reversible: the release being
 * put in is never the one currently answering, so a failed install leaves the working lab alone and
 * an operator can point the launcher back at a version that worked.
 */
export function installedPaths(version: string, environment = process.env): InstalledPaths {
    const home = path.join(homedir(), InstalledLayout.HOME_DIRECTORY);
    const binDirectory = resolveBinDirectory(environment);

    return {
        home,
        version: path.join(home, InstalledLayout.VERSIONS_DIRECTORY, version),
        binDirectory,
        launcher: path.join(binDirectory, launcherName()),
        receipt: path.join(home, InstalledLayout.RECEIPT_FILE)
    };
}

/**
 * The directory the launcher goes in.
 *
 * An operator who named one is obeyed. Otherwise this is the directory a user's own executables
 * belong in, which the XDG specification names and which every shell on these platforms either has
 * on `PATH` already or can be told about once.
 */
export function resolveBinDirectory(environment = process.env): string {
    const named = environment[InstallEnvironment.INSTALL_DIRECTORY];
    if (isStated(named)) {
        return path.resolve(expandHome(named));
    }

    const xdg = environment[InstallEnvironment.XDG_BIN_HOME];
    if (isStated(xdg) && path.isAbsolute(expandHome(xdg))) {
        return expandHome(xdg);
    }

    return path.join(homedir(), InstalledLayout.FALLBACK_BIN_DIRECTORY);
}

/** What the operator types, which on Windows has to say that it is a program. */
export function launcherName(platform = process.platform): string {
    return platform === "win32" ? "openlab.cmd" : "openlab";
}

/** The executable inside a release, which on Windows carries the suffix Windows requires. */
export function executableName(platform = process.platform): string {
    return platform === "win32" ? "openlab.exe" : "openlab";
}

/** An empty variable is an operator who set nothing, not an operator who asked for the empty path. */
function isStated(value: string | undefined): value is string {
    return value !== undefined && value.trim().length > 0;
}

/** Nothing expands a leading `~` inside a launch agent or a unit file, so the lab expands one itself. */
function expandHome(value: string): string {
    return value.startsWith("~/") ? path.join(homedir(), value.slice(2)) : value;
}
