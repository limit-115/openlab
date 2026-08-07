import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { and, eq, notInArray } from "drizzle-orm";
import { leads } from "#src/lab-database/lab-schema";
import { assertUpserted } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertLeads(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    for (const lead of snapshot.leads) {
        const outcome = lead.outcome ?? null;
        const updatedAt = new Date(lead.updated_at);
        const records = await database
            .insert(leads)
            .values({
                id: lead.id,
                investigationId: snapshot.investigation.id,
                cycle: lead.cycle,
                statement: lead.statement,
                rationale: lead.rationale,
                status: lead.status,
                outcome,
                createdAt: new Date(lead.created_at),
                updatedAt
            })
            .onConflictDoUpdate({
                target: leads.id,
                set: {
                    cycle: lead.cycle,
                    statement: lead.statement,
                    rationale: lead.rationale,
                    status: lead.status,
                    outcome,
                    updatedAt
                },
                setWhere: eq(leads.investigationId, snapshot.investigation.id)
            })
            .returning({ id: leads.id });
        assertUpserted(records, "lead", lead.id);
    }
}

export async function deleteMissingLeads(
    database: RuntimeProjectionDatabase,
    investigationId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(leads)
        .where(
            ids.length === 0
                ? eq(leads.investigationId, investigationId)
                : and(eq(leads.investigationId, investigationId), notInArray(leads.id, ids))
        );
}
