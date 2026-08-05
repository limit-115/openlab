import type { StatusSnapshot } from "@nightlab/protocol/investigation-status/status-snapshot.types";
import { and, eq, notInArray } from "drizzle-orm";
import { assumptions } from "#src/lab-database/lab-schema";
import { assertUpserted } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertAssumptions(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    for (const assumption of snapshot.assumptions) {
        const outcome = assumption.outcome ?? null;
        const updatedAt = new Date(assumption.updated_at);
        const records = await database
            .insert(assumptions)
            .values({
                id: assumption.id,
                investigationId: snapshot.investigation.id,
                cycle: assumption.cycle,
                statement: assumption.statement,
                rationale: assumption.rationale,
                status: assumption.status,
                outcome,
                createdAt: new Date(assumption.created_at),
                updatedAt
            })
            .onConflictDoUpdate({
                target: assumptions.id,
                set: {
                    cycle: assumption.cycle,
                    statement: assumption.statement,
                    rationale: assumption.rationale,
                    status: assumption.status,
                    outcome,
                    updatedAt
                },
                setWhere: eq(assumptions.investigationId, snapshot.investigation.id)
            })
            .returning({ id: assumptions.id });
        assertUpserted(records, "assumption", assumption.id);
    }
}

export async function deleteMissingAssumptions(
    database: RuntimeProjectionDatabase,
    investigationId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(assumptions)
        .where(
            ids.length === 0
                ? eq(assumptions.investigationId, investigationId)
                : and(
                      eq(assumptions.investigationId, investigationId),
                      notInArray(assumptions.id, ids)
                  )
        );
}
