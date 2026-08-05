import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { and, eq, notInArray } from "drizzle-orm";
import { verdicts } from "#src/lab-database/lab-schema";
import { assertUpserted } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertVerdicts(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    for (const verdict of snapshot.verdicts) {
        const mutable = { confirmed: verdict.confirmed, reasoning: verdict.reasoning };
        const records = await database
            .insert(verdicts)
            .values({
                id: verdict.id,
                investigationId: snapshot.investigation.id,
                findingId: verdict.finding_id,
                runId: verdict.run_id,
                ...mutable,
                createdAt: new Date(verdict.created_at)
            })
            .onConflictDoUpdate({
                target: verdicts.id,
                set: mutable,
                setWhere: eq(verdicts.investigationId, snapshot.investigation.id)
            })
            .returning({ id: verdicts.id });
        assertUpserted(records, "verdict", verdict.id);
    }
}

export async function deleteMissingVerdicts(
    database: RuntimeProjectionDatabase,
    investigationId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(verdicts)
        .where(
            ids.length === 0
                ? eq(verdicts.investigationId, investigationId)
                : and(eq(verdicts.investigationId, investigationId), notInArray(verdicts.id, ids))
        );
}
