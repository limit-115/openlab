import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ReleaseManifest } from "@openlab/core/release-channel/release-manifest.types";
import { currentReleaseTarget } from "@openlab/core/release-channel/release-target";
import semver from "semver";
import { installLab } from "#src/lab-installation/install-lab";
import { readInstallReceipt } from "#src/lab-installation/install-receipt";
import type { InstallReceipt } from "#src/lab-installation/install-receipt.types";
import { executableName, installedPaths } from "#src/lab-installation/installed-layout";
import { downloadArtifact } from "#src/lab-update/download-release";
import { offeredRelease, releaseNotesUrl, releaseUrl } from "#src/lab-update/release-channel";
import { retireVersions, runningVersion } from "#src/lab-update/retire-versions";
import { unpackRelease } from "#src/lab-update/unpack-release";
import { UpdateError } from "#src/lab-update/update-error";
import { UpdateResult } from "#src/lab-update/update-lab.const";
import type { UpdateOutcome, UpdateRequest } from "#src/lab-update/update-lab.types";

/**
 * Moves an installed lab to the release the channel offers, or to one an operator names.
 *
 * Everything about where a version goes and what ends up on `PATH` is already decided by the
 * install this hands over to. What an update adds is the two steps before it: finding out what the
 * channel offers, and getting that release onto the disk in a state an install will accept. It is
 * the bootstrap installer's work, done by code that can be tested.
 *
 * The lab currently answering is never disturbed. It runs out of a directory named after its own
 * version and finds everything it reads beside its own executable, so a new version arrives beside
 * it and the launcher is pointed at the new one. What is already running keeps running the release
 * it started on until it is restarted.
 */
export async function updateLab(request: UpdateRequest): Promise<UpdateOutcome> {
    const environment = request.environment ?? process.env;
    const running = request.runningVersion;

    const receipt = await readInstallReceipt(installedPaths(running, environment).receipt);
    if (receipt === undefined) {
        return outcomeOf(UpdateResult.NOT_INSTALLED, running);
    }

    const named = request.version;
    if (named === running) {
        return { ...outcomeOf(UpdateResult.ALREADY_CURRENT, running), offeredVersion: running };
    }

    /**
     * A version an operator names and that is still on disk needs neither the channel nor a
     * download. The release is already there, and installing it is pointing the launcher back at
     * it, which is what makes a rollback work on a machine that cannot reach a network at all.
     */
    if (named !== undefined && !request.check && holdsRelease(named, environment)) {
        return install(named, receipt, request, environment, true);
    }

    const manifest = await offeredRelease(named, environment);
    const offered = manifest.version;

    if (offered === running) {
        return { ...outcomeOf(UpdateResult.ALREADY_CURRENT, running), offeredVersion: offered };
    }

    /**
     * A lab ahead of what is published is told so rather than moved back. It is what a developer
     * running their own build sees, and taking that build away from them because the channel
     * happens to be behind it is not an update. Naming a version is how going backwards is asked
     * for, and an operator who names one is taken at their word.
     */
    if (named === undefined && isAheadOf(running, offered)) {
        return { ...outcomeOf(UpdateResult.AHEAD_OF_CHANNEL, running), offeredVersion: offered };
    }

    if (request.check) {
        return {
            ...outcomeOf(UpdateResult.AVAILABLE, running),
            offeredVersion: offered,
            notesUrl: releaseNotesUrl(offered, environment)
        };
    }

    if (holdsRelease(offered, environment)) {
        return install(offered, receipt, request, environment, true);
    }

    const workspace = await mkdtemp(path.join(tmpdir(), `openlab-update-${offered}-`));
    try {
        const from = await bringInRelease(manifest, offered, workspace, environment);
        return await install(offered, receipt, request, environment, false, from);
    } finally {
        await rm(workspace, { recursive: true, force: true });
    }
}

/**
 * Hands the release over to the install, then takes back the disk the update no longer needs.
 *
 * What is kept is the version now answering and the one it replaced. Nothing a running lab reads
 * out of is removed either: a lab resolves its own executable at startup and reads its dashboard
 * and its migrations beside it, so its directory outlives an update that happened underneath it.
 */
async function install(
    version: string,
    receipt: InstallReceipt,
    request: UpdateRequest,
    environment: NodeJS.ProcessEnv,
    fromDisk: boolean,
    from?: string
): Promise<UpdateOutcome> {
    const paths = installedPaths(version, environment);
    const installed = await installLab({
        from: from ?? paths.version,
        version,
        paths,
        modifyPath: false
    });

    const versions = path.dirname(paths.version);
    const retired = request.prune
        ? await retireVersions(versions, [version, receipt.version, runningVersion(versions)])
        : [];

    return {
        result: UpdateResult.UPDATED,
        runningVersion: request.runningVersion,
        offeredVersion: version,
        versionDirectory: installed.versionDirectory,
        notesUrl: releaseNotesUrl(version, environment),
        fromDisk,
        retired
    };
}

/** Downloads this platform's archive, refuses it unless it verifies, and lays it out. */
async function bringInRelease(
    manifest: ReleaseManifest,
    version: string,
    workspace: string,
    environment: NodeJS.ProcessEnv
): Promise<string> {
    const target = currentReleaseTarget();
    if (target === undefined) {
        throw new UpdateError(
            `OpenLab has no build for ${process.platform}-${process.arch}. Nothing was installed.`
        );
    }

    const artifact = manifest.artifacts[target];
    if (artifact === undefined) {
        throw new UpdateError(`Release ${version} has no build for ${target}.`);
    }

    const archive = await downloadArtifact(
        `${releaseUrl(version, environment)}/${artifact.file}`,
        artifact,
        workspace
    );
    return unpackRelease(archive, path.join(workspace, "release"));
}

/** Whether a version is already installed here as a whole release rather than a leftover directory. */
function holdsRelease(version: string, environment: NodeJS.ProcessEnv): boolean {
    return existsSync(path.join(installedPaths(version, environment).version, executableName()));
}

/**
 * Whether what is running is past what the channel offers.
 *
 * A version neither side can order is not evidence of anything, so it is not treated as being
 * behind: a lab whose version does not parse is left where it is rather than moved by guesswork.
 */
function isAheadOf(running: string, offered: string): boolean {
    const here = semver.valid(running);
    const there = semver.valid(offered);
    return here !== null && there !== null && semver.gt(here, there);
}

function outcomeOf(result: UpdateOutcome["result"], runningVersion: string): UpdateOutcome {
    return {
        result,
        runningVersion,
        offeredVersion: undefined,
        versionDirectory: undefined,
        notesUrl: undefined,
        fromDisk: false,
        retired: []
    };
}
