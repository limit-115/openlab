import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
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
                labId: snapshot.lab.id,
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
                setWhere: eq(assumptions.labId, snapshot.lab.id)
            })
            .returning({ id: assumptions.id });
        assertUpserted(records, "assumption", assumption.id);
    }
}

export async function deleteMissingAssumptions(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(assumptions)
        .where(
            ids.length === 0
                ? eq(assumptions.labId, labId)
                : and(eq(assumptions.labId, labId), notInArray(assumptions.id, ids))
        );
}
