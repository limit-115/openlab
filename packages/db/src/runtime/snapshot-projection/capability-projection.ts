import type { StatusSnapshot } from "@lab/protocol/status";
import { and, eq, notInArray } from "drizzle-orm";
import { capabilityRequests } from "#src/lab-database/lab-schema";
import { assertUpserted } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertCapabilities(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const capability of snapshot.capability_requests) {
        const providedAt =
            capability.provided_at === undefined ? null : new Date(capability.provided_at);
        const resourceReference = capability.resource_reference ?? null;
        const records = await database
            .insert(capabilityRequests)
            .values({
                id: capability.id,
                labId: snapshot.lab.id,
                need: capability.need,
                reason: capability.reason,
                provisioningHint: capability.provisioning_hint,
                status: capability.status,
                resourceReference,
                providedAt,
                createdAt: new Date(capability.created_at),
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: capabilityRequests.id,
                set: {
                    need: capability.need,
                    reason: capability.reason,
                    provisioningHint: capability.provisioning_hint,
                    status: capability.status,
                    resourceReference,
                    providedAt,
                    updatedAt: projectionAt
                },
                setWhere: eq(capabilityRequests.labId, snapshot.lab.id)
            })
            .returning({ id: capabilityRequests.id });
        assertUpserted(records, "capability request", capability.id);
    }
}

export async function deleteMissingCapabilities(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(capabilityRequests)
        .where(
            ids.length === 0
                ? eq(capabilityRequests.labId, labId)
                : and(eq(capabilityRequests.labId, labId), notInArray(capabilityRequests.id, ids))
        );
}
