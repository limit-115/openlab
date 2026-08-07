import type { InstallReceipt } from "#src/lab-installation/install-receipt.types";
import type { ProgramPaths } from "#src/lab-installation/installed-layout";
import type { UpdateResult } from "#src/lab-update/update-lab.const";
import type { ReportUpdate } from "#src/lab-update/update-progress.types";

export interface UpdateRequest {
    /** What is answering now, which is what the channel's offer is compared against. */
    readonly runningVersion: string;
    /** The version an operator named, which is also how a rollback is asked for. */
    readonly version: string | undefined;
    /** Say what the channel offers and install nothing. */
    readonly check: boolean;
    /** Delete the versions this update leaves behind. */
    readonly prune: boolean;
    readonly environment?: NodeJS.ProcessEnv;
    /** Where an operator hears what is happening. Left out, an update works in silence. */
    readonly report?: ReportUpdate;
}

/**
 * One release about to be put in place.
 *
 * `from` is where the release is right now, and its absence is the whole of what "this was already
 * on disk" means: nothing was downloaded, the release is in the directory it belongs in, and the
 * install has only the launcher left to move.
 */
export interface PlaceRelease {
    readonly version: string;
    readonly from: string | undefined;
    readonly receipt: InstallReceipt;
    readonly paths: ProgramPaths;
    readonly request: UpdateRequest;
}

/** What an update came to, in the terms an operator needs to hear it in. */
export interface UpdateOutcome {
    readonly result: UpdateResult;
    readonly runningVersion: string;
    /** What the channel offered, which is nothing when it was never asked. */
    readonly offeredVersion: string | undefined;
    readonly versionDirectory: string | undefined;
    readonly notesUrl: string | undefined;
    /** The release was already on disk, so only the launcher had to move. */
    readonly fromDisk: boolean;
    readonly retired: readonly string[];
}
