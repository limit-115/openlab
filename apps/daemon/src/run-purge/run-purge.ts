import { InvestigationRepository } from "@lab/db/investigations/investigation-repository";
import { createDatabase } from "@lab/db/lab-database/lab-database-client";
import {
    CurrentPointerStatus,
    readCurrentPointer
} from "#src/investigation-workspace/investigation-run-pointer";
import { PurgeScope } from "#src/run-purge/run-purge.const";
import type {
    PurgePlan,
    PurgePlanInput,
    PurgeResult,
    PurgeRunsInput
} from "#src/run-purge/run-purge.types";
import { listRunInvestigationIds, purgeRunDirectories } from "#src/run-purge/run-purge-directories";

export async function readCurrentInvestigationId(
    workspaceRoot: string
): Promise<string | undefined> {
    const pointer = await readCurrentPointer(workspaceRoot);
    return pointer.status === CurrentPointerStatus.VALID
        ? pointer.pointer.investigation_id
        : undefined;
}

/**
 * Reports what a purge would remove. Disk and database are unioned because they drift apart
 * whenever a run directory is deleted by hand, and the leftover rows still have to be purgeable.
 */
export async function planPurge(input: PurgePlanInput): Promise<PurgePlan> {
    const client = createDatabase(input.databaseUrl, { max: 1 });
    let persistedInvestigationIds: string[];
    try {
        persistedInvestigationIds = await new InvestigationRepository(client.db).listIds();
    } finally {
        await client.close();
    }
    const directoryInvestigationIds = await listRunInvestigationIds(input.workspaceRoot);
    return {
        investigationIds: [
            ...new Set([...persistedInvestigationIds, ...directoryInvestigationIds])
        ].sort(),
        currentInvestigationId: await readCurrentInvestigationId(input.workspaceRoot)
    };
}

/**
 * Deletes run history from the database first and from disk second, so that an interrupted purge
 * leaves recoverable directories rather than rows pointing at directories that no longer exist.
 */
export async function purgeRuns(input: PurgeRunsInput): Promise<PurgeResult> {
    const keptInvestigationId =
        input.scope === PurgeScope.EXCEPT_CURRENT
            ? await readCurrentInvestigationId(input.workspaceRoot)
            : undefined;

    const client = createDatabase(input.databaseUrl, { max: 1 });
    let purgedInvestigationIds: string[];
    try {
        purgedInvestigationIds = await new InvestigationRepository(client.db).purge(
            keptInvestigationId
        );
    } finally {
        await client.close();
    }

    const purgedDirectories = await purgeRunDirectories({
        workspaceRoot: input.workspaceRoot,
        keptInvestigationId
    });

    return {
        purgedInvestigationIds: [
            ...new Set([...purgedInvestigationIds, ...purgedDirectories])
        ].sort(),
        keptInvestigationId,
        purgedDirectoryCount: purgedDirectories.length,
        purgedInvestigationRowCount: purgedInvestigationIds.length
    };
}
