import { readFile } from "node:fs/promises";
import semver from "semver";
import writeFileAtomic from "write-file-atomic";
import { readInstallReceipt } from "#src/lab-installation/install-receipt";
import { programPaths } from "#src/lab-installation/installed-layout";
import { offeredRelease, releaseNotesUrl } from "#src/lab-update/release-channel";
import {
    UPDATE_CHECK_INTERVAL_MS,
    UPDATE_CHECK_TIMEOUT_MS
} from "#src/lab-update/update-notice.const";
import type { UpdateCheck, UpdateNotice } from "#src/lab-update/update-notice.types";

/**
 * A release worth telling an operator about, when there is one.
 *
 * A lab is told and nothing is installed for it. A lab runs investigations for hours, and a release
 * that arrived underneath one is a change nobody asked for at a moment nobody chose; whereas a
 * sentence at startup costs the operator one command whenever they decide it is a good time.
 *
 * Nothing here can stop a lab from starting. A channel that cannot be reached, an answer that is not
 * a manifest, a version that will not parse, a home that cannot be written to — every one of them
 * ends the same way, which is with no notice and a lab that came up.
 */
export async function noticeOfNewerRelease(
    runningVersion: string,
    environment: NodeJS.ProcessEnv = process.env,
    now: number = Date.now()
): Promise<UpdateNotice | undefined> {
    try {
        return await lookForNewerRelease(runningVersion, environment, now);
    } catch {
        return undefined;
    }
}

async function lookForNewerRelease(
    runningVersion: string,
    environment: NodeJS.ProcessEnv,
    now: number
): Promise<UpdateNotice | undefined> {
    const paths = programPaths(environment);

    /** A lab this program did not install is a lab it cannot update, so it does not mention one. */
    if ((await readInstallReceipt(paths.receipt)) === undefined) {
        return undefined;
    }

    const offered = await offeredVersion(paths.updateCheck, environment, now);
    if (offered === undefined || !isNewerThan(offered, runningVersion)) {
        return undefined;
    }
    return { offeredVersion: offered, notesUrl: releaseNotesUrl(offered, environment) };
}

/** What the channel offers, asked for at most once a day and remembered in between. */
async function offeredVersion(
    checkFile: string,
    environment: NodeJS.ProcessEnv,
    now: number
): Promise<string | undefined> {
    const remembered = await lastCheck(checkFile);
    if (
        remembered !== undefined &&
        now - Date.parse(remembered.checked_at) < UPDATE_CHECK_INTERVAL_MS
    ) {
        return remembered.offered_version;
    }

    const manifest = await offeredRelease(undefined, environment, UPDATE_CHECK_TIMEOUT_MS);
    const check: UpdateCheck = {
        checked_at: new Date(now).toISOString(),
        offered_version: manifest.version
    };
    await writeFileAtomic(checkFile, `${JSON.stringify(check, null, 4)}\n`);
    return manifest.version;
}

/** The last answer, or nothing at all when there has never been one worth keeping. */
async function lastCheck(checkFile: string): Promise<UpdateCheck | undefined> {
    try {
        return JSON.parse(await readFile(checkFile, "utf8")) as UpdateCheck;
    } catch {
        return undefined;
    }
}

/**
 * A version that is only different is not a version worth mentioning. An operator running their own
 * build is ahead of the channel and is not to be told about the release they are already past.
 */
function isNewerThan(offered: string, running: string): boolean {
    const there = semver.valid(offered);
    const here = semver.valid(running);
    return there !== null && here !== null && semver.gt(there, here);
}
