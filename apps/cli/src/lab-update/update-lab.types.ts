import type { UpdateResult } from "#src/lab-update/update-lab.const";

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
