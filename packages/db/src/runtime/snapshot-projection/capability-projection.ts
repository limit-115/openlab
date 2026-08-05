import type { StatusSnapshot } from "@nightlab/protocol/investigation-status/status-snapshot.types";
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
        const answeredAt =
            capability.answered_at === undefined ? null : new Date(capability.answered_at);
        const answer = capability.answer ?? null;
        const selfProvisioningAttempt = capability.self_provisioning_attempt ?? null;
        const records = await database
            .insert(capabilityRequests)
            .values({
                id: capability.id,
                investigationId: snapshot.investigation.id,
                need: capability.need,
                reason: capability.reason,
                provisioningHint: capability.provisioning_hint,
                selfProvisioningAttempt,
                blocking: capability.blocking,
                status: capability.status,
                answer,
                answeredAt,
                createdAt: new Date(capability.created_at),
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: capabilityRequests.id,
                set: {
                    need: capability.need,
                    reason: capability.reason,
                    provisioningHint: capability.provisioning_hint,
                    selfProvisioningAttempt,
                    blocking: capability.blocking,
                    status: capability.status,
                    answer,
                    answeredAt,
                    updatedAt: projectionAt
                },
                setWhere: eq(capabilityRequests.investigationId, snapshot.investigation.id)
            })
            .returning({ id: capabilityRequests.id });
        assertUpserted(records, "capability request", capability.id);
    }
}

export async function deleteMissingCapabilities(
    database: RuntimeProjectionDatabase,
    investigationId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(capabilityRequests)
        .where(
            ids.length === 0
                ? eq(capabilityRequests.investigationId, investigationId)
                : and(
                      eq(capabilityRequests.investigationId, investigationId),
                      notInArray(capabilityRequests.id, ids)
                  )
        );
}
