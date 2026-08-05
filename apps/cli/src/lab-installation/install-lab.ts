import { cp, mkdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { writeInstallReceipt } from "#src/lab-installation/install-receipt";
import type { InstallReceipt } from "#src/lab-installation/install-receipt.types";
import { executableName, type InstalledPaths } from "#src/lab-installation/installed-layout";
import { ensureOnPath } from "#src/lab-installation/path-entry";

export interface InstallRequest {
    /** The release being installed, which is the directory the running executable sits in. */
    readonly from: string;
    readonly version: string;
    readonly paths: InstalledPaths;
    /** An operator who manages their own `PATH` is not to be written to. */
    readonly modifyPath: boolean;
    readonly platform?: NodeJS.Platform;
}

/** What an install came to, in the terms an operator needs to hear it in. */
export interface InstallOutcome {
    readonly version: string;
    readonly versionDirectory: string;
    readonly launcher: string;
    readonly pathFiles: readonly string[];
    readonly alreadyOnPath: boolean;
}

/**
 * Installs the release this executable is running from.
 *
 * The release arrives already laid out — the executable and the directories it reads sit together
 * in whatever directory the bootstrap unpacked them into — so installing is moving that layout to
 * where it belongs and pointing a launcher at it. Nothing is assembled here that the release did
 * not already contain.
 *
 * The move happens beside the destination and is renamed onto it, so a version directory is either
 * the whole release or was never there. A lab currently answering is untouched until that rename.
 */
export async function installLab(request: InstallRequest): Promise<InstallOutcome> {
    const platform = request.platform ?? process.platform;
    const { paths, version } = request;

    await mkdir(path.dirname(paths.version), { recursive: true });
    if (path.resolve(request.from) !== path.resolve(paths.version)) {
        await placeVersion(request.from, paths.version);
    }

    await mkdir(paths.binDirectory, { recursive: true });
    const target = path.join(paths.version, executableName(platform));
    await writeLauncher(paths.launcher, target, platform);

    const onPath = request.modifyPath
        ? await ensureOnPath(paths.binDirectory)
        : { written: [], alreadyOnPath: false };

    const receipt: InstallReceipt = {
        version,
        installed_at: new Date().toISOString(),
        version_directory: paths.version,
        launcher: paths.launcher,
        path_files: onPath.written
    };
    await writeInstallReceipt(paths.receipt, receipt);

    return {
        version,
        versionDirectory: paths.version,
        launcher: paths.launcher,
        pathFiles: onPath.written,
        alreadyOnPath: onPath.alreadyOnPath
    };
}

/** Copies a release in beside where it belongs, then renames it on in one step. */
async function placeVersion(from: string, destination: string): Promise<void> {
    const incoming = `${destination}.incoming`;
    await rm(incoming, { recursive: true, force: true });
    await cp(from, incoming, { recursive: true, verbatimSymlinks: true });

    await rm(destination, { recursive: true, force: true });
    await rename(incoming, destination);
}

/**
 * Points what the operator types at the version that should answer it.
 *
 * A symlink is what makes a version swap instant everywhere it is already on `PATH`. Windows grants
 * symlinks only to a developer mode or an administrator, neither of which an install may assume, so
 * there it is a one-line script that hands over to the same executable.
 */
async function writeLauncher(
    launcher: string,
    target: string,
    platform: NodeJS.Platform
): Promise<void> {
    await rm(launcher, { force: true });

    if (platform === "win32") {
        await writeFile(launcher, `@echo off\r\n"${target}" %*\r\n`, "utf8");
        return;
    }
    await symlink(target, launcher);
}
