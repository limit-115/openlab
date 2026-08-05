import { InvestigationRepository } from "@openlab/db/investigations/investigation-repository";
import { createDatabase } from "@openlab/db/lab-database/lab-database-client";
import { labDatabasePath } from "#src/lab-home/lab-home";
import type {
    PurgePlan,
    PurgePlanInput,
    PurgeResult,
    PurgeRunsInput
} from "#src/run-purge/run-purge.types";
import { listRunInvestigationIds, purgeRunDirectories } from "#src/run-purge/run-purge-directories";

/**
 * Reports what a purge would remove. Disk and database are unioned because they drift apart
 * whenever a run directory is deleted by hand, and the leftover rows still have to be purgeable.
 */
export async function planPurge(input: PurgePlanInput): Promise<PurgePlan> {
    const client = createDatabase(labDatabasePath(input.workspaceRoot));
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
        ].sort()
    };
}

/**
 * Empties the lab: every investigation, from the database first and from disk second, so that an
 * interrupted purge leaves recoverable directories rather than rows pointing at directories that
 * no longer exist. Discarding one investigation is the daemon's job, not this one's.
 */
export async function purgeRuns(input: PurgeRunsInput): Promise<PurgeResult> {
    const client = createDatabase(labDatabasePath(input.workspaceRoot));
    let purgedInvestigationIds: string[];
    try {
        purgedInvestigationIds = await new InvestigationRepository(client.db).purge();
    } finally {
        await client.close();
    }

    const purgedDirectories = await purgeRunDirectories({ workspaceRoot: input.workspaceRoot });

    return {
        purgedInvestigationIds: [
            ...new Set([...purgedInvestigationIds, ...purgedDirectories])
        ].sort(),
        purgedDirectoryCount: purgedDirectories.length,
        purgedInvestigationRowCount: purgedInvestigationIds.length
    };
}
