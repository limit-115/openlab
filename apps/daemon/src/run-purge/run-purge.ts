import { createDatabase } from "@lab/db/lab-database/lab-database-client";
import { LabRepository } from "@lab/db/labs/lab-repository";
import { CurrentPointerStatus, readCurrentPointer } from "#src/lab-workspace/lab-run-pointer";
import { PurgeScope } from "#src/run-purge/run-purge.const";
import type {
    PurgePlan,
    PurgePlanInput,
    PurgeResult,
    PurgeRunsInput
} from "#src/run-purge/run-purge.types";
import { listRunLabIds, purgeRunDirectories } from "#src/run-purge/run-purge-directories";

export async function readCurrentLabId(workspaceRoot: string): Promise<string | undefined> {
    const pointer = await readCurrentPointer(workspaceRoot);
    return pointer.status === CurrentPointerStatus.VALID ? pointer.pointer.lab_id : undefined;
}

/**
 * Reports what a purge would remove. Disk and database are unioned because they drift apart
 * whenever a run directory is deleted by hand, and the leftover rows still have to be purgeable.
 */
export async function planPurge(input: PurgePlanInput): Promise<PurgePlan> {
    const client = createDatabase(input.databaseUrl, { max: 1 });
    let persistedLabIds: string[];
    try {
        persistedLabIds = await new LabRepository(client.db).listIds();
    } finally {
        await client.close();
    }
    const directoryLabIds = await listRunLabIds(input.workspaceRoot);
    return {
        labIds: [...new Set([...persistedLabIds, ...directoryLabIds])].sort(),
        currentLabId: await readCurrentLabId(input.workspaceRoot)
    };
}

/**
 * Deletes run history from the database first and from disk second, so that an interrupted purge
 * leaves recoverable directories rather than rows pointing at directories that no longer exist.
 */
export async function purgeRuns(input: PurgeRunsInput): Promise<PurgeResult> {
    const keptLabId =
        input.scope === PurgeScope.EXCEPT_CURRENT
            ? await readCurrentLabId(input.workspaceRoot)
            : undefined;

    const client = createDatabase(input.databaseUrl, { max: 1 });
    let purgedLabIds: string[];
    try {
        purgedLabIds = await new LabRepository(client.db).purge(keptLabId);
    } finally {
        await client.close();
    }

    const purgedDirectories = await purgeRunDirectories({
        workspaceRoot: input.workspaceRoot,
        keptLabId
    });

    return {
        purgedLabIds: [...new Set([...purgedLabIds, ...purgedDirectories])].sort(),
        keptLabId,
        purgedDirectoryCount: purgedDirectories.length,
        purgedLabRowCount: purgedLabIds.length
    };
}
