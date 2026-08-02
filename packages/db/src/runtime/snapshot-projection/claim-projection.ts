import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { claimDependencies, claims } from "#src/lab-database/lab-schema";
import { assertUpserted, idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function upsertClaims(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    for (const claim of snapshot.claims) {
        const records = await database
            .insert(claims)
            .values({
                id: claim.id,
                labId: snapshot.lab.id,
                branchId: claim.branch_id,
                statement: claim.statement,
                status: claim.status,
                stale: claim.stale,
                createdAt: new Date(claim.created_at),
                updatedAt: new Date(claim.updated_at)
            })
            .onConflictDoUpdate({
                target: claims.id,
                set: {
                    branchId: claim.branch_id,
                    statement: claim.statement,
                    status: claim.status,
                    stale: claim.stale,
                    updatedAt: new Date(claim.updated_at)
                },
                setWhere: eq(claims.labId, snapshot.lab.id)
            })
            .returning({ id: claims.id });
        assertUpserted(records, "claim", claim.id);
    }
}

export async function replaceClaimDependencies(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    const claimIds = idsOf(snapshot.claims);
    if (claimIds.length === 0) {
        return;
    }
    await database.delete(claimDependencies).where(inArray(claimDependencies.claimId, claimIds));
    const dependencies = snapshot.claims.flatMap((claim) =>
        claim.assumption_ids.map((dependencyId) => ({
            claimId: claim.id,
            dependencyId
        }))
    );
    if (dependencies.length > 0) {
        await database.insert(claimDependencies).values(dependencies);
    }
}

export async function deleteMissingClaims(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(claims)
        .where(
            ids.length === 0
                ? eq(claims.labId, labId)
                : and(eq(claims.labId, labId), notInArray(claims.id, ids))
        );
}
