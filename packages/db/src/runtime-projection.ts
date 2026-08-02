import { SchedulerLane } from "@lab/core/constants";
import { CapabilityStatus } from "@lab/protocol/constants";
import type { StatusSnapshot } from "@lab/protocol/status";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { Database } from "#src/client";
import { branches, capabilityRequests, claimDependencies, claims, tasks } from "#src/schema";

const RuntimeProjectionDefaults = {
    BRANCH_LANE: SchedulerLane.EXPLORATION,
    TASK_LANE: SchedulerLane.EXPLORATION,
    TASK_PRIORITY: 0
} as const;

type RuntimeProjectionDatabase = Pick<Database, "delete" | "insert" | "select">;

export async function projectRuntimeSnapshot(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    assertProjectionRelationships(snapshot);
    const labId = snapshot.lab.id;
    const projectionAt = new Date(snapshot.lab.updated_at);

    await assertEntityOwnership(database, snapshot);
    await upsertBranches(database, snapshot, projectionAt);
    await upsertTasks(database, snapshot, projectionAt);
    await upsertClaims(database, snapshot);
    await replaceClaimDependencies(database, snapshot);
    await upsertCapabilities(database, snapshot, projectionAt);

    await deleteMissingCapabilities(database, labId, idsOf(snapshot.capability_requests));
    await deleteMissingTasks(database, labId, idsOf(snapshot.tasks));
    await deleteMissingClaims(database, labId, idsOf(snapshot.claims));
    await deleteMissingBranches(database, labId, idsOf(snapshot.branches));
}

async function upsertBranches(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const branch of snapshot.branches) {
        const records = await database
            .insert(branches)
            .values({
                id: branch.id,
                labId: snapshot.lab.id,
                title: branch.title,
                approach: branch.approach,
                status: branch.status,
                lane: RuntimeProjectionDefaults.BRANCH_LANE,
                createdAt: projectionAt,
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: branches.id,
                set: {
                    title: branch.title,
                    approach: branch.approach,
                    status: branch.status,
                    updatedAt: projectionAt
                },
                setWhere: eq(branches.labId, snapshot.lab.id)
            })
            .returning({ id: branches.id });
        assertUpserted(records, "branch", branch.id);
    }
}

async function upsertTasks(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const task of snapshot.tasks) {
        const records = await database
            .insert(tasks)
            .values({
                id: task.id,
                labId: snapshot.lab.id,
                branchId: task.branch_id,
                objective: task.objective,
                contextRefs: task.context_refs,
                status: task.status,
                role: task.role,
                lane: RuntimeProjectionDefaults.TASK_LANE,
                priority: RuntimeProjectionDefaults.TASK_PRIORITY,
                attempt: task.attempt,
                availableAt: projectionAt,
                createdAt: projectionAt,
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: tasks.id,
                set: {
                    branchId: task.branch_id,
                    objective: task.objective,
                    contextRefs: task.context_refs,
                    status: task.status,
                    role: task.role,
                    attempt: task.attempt,
                    updatedAt: projectionAt
                },
                setWhere: eq(tasks.labId, snapshot.lab.id)
            })
            .returning({ id: tasks.id });
        assertUpserted(records, "task", task.id);
    }
}

async function upsertClaims(
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

async function replaceClaimDependencies(
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

async function upsertCapabilities(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const capability of snapshot.capability_requests) {
        const providedAt =
            capability.status === CapabilityStatus.PROVIDED ? projectionAt : undefined;
        const records = await database
            .insert(capabilityRequests)
            .values({
                id: capability.id,
                labId: snapshot.lab.id,
                need: capability.need,
                reason: capability.reason,
                provisioningHint: capability.provisioning_hint,
                status: capability.status,
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
                    ...(providedAt === undefined
                        ? {}
                        : {
                              providedAt: sql`coalesce(${capabilityRequests.providedAt}, ${sql.param(
                                  providedAt,
                                  capabilityRequests.providedAt
                              )})`
                          }),
                    updatedAt: projectionAt
                },
                setWhere: eq(capabilityRequests.labId, snapshot.lab.id)
            })
            .returning({ id: capabilityRequests.id });
        assertUpserted(records, "capability request", capability.id);
    }
}

async function deleteMissingCapabilities(
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

async function deleteMissingTasks(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(tasks)
        .where(
            ids.length === 0
                ? eq(tasks.labId, labId)
                : and(eq(tasks.labId, labId), notInArray(tasks.id, ids))
        );
}

async function deleteMissingClaims(
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

async function deleteMissingBranches(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(branches)
        .where(
            ids.length === 0
                ? eq(branches.labId, labId)
                : and(eq(branches.labId, labId), notInArray(branches.id, ids))
        );
}

async function assertEntityOwnership(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    const branchIds = idsOf(snapshot.branches);
    const taskIds = idsOf(snapshot.tasks);
    const claimIds = idsOf(snapshot.claims);
    const capabilityIds = idsOf(snapshot.capability_requests);
    const [ownedBranches, ownedTasks, ownedClaims, ownedCapabilities] = await Promise.all([
        branchIds.length === 0
            ? []
            : database
                  .select({ id: branches.id, labId: branches.labId })
                  .from(branches)
                  .where(inArray(branches.id, branchIds)),
        taskIds.length === 0
            ? []
            : database
                  .select({ id: tasks.id, labId: tasks.labId })
                  .from(tasks)
                  .where(inArray(tasks.id, taskIds)),
        claimIds.length === 0
            ? []
            : database
                  .select({ id: claims.id, labId: claims.labId })
                  .from(claims)
                  .where(inArray(claims.id, claimIds)),
        capabilityIds.length === 0
            ? []
            : database
                  .select({ id: capabilityRequests.id, labId: capabilityRequests.labId })
                  .from(capabilityRequests)
                  .where(inArray(capabilityRequests.id, capabilityIds))
    ]);
    const foreign = [...ownedBranches, ...ownedTasks, ...ownedClaims, ...ownedCapabilities].find(
        (record) => record.labId !== snapshot.lab.id
    );
    if (foreign !== undefined) {
        throw new Error(`Entity ${foreign.id} belongs to another lab`);
    }
}

function assertProjectionRelationships(snapshot: StatusSnapshot): void {
    assertUniqueIds("branch", idsOf(snapshot.branches));
    assertUniqueIds("task", idsOf(snapshot.tasks));
    assertUniqueIds("claim", idsOf(snapshot.claims));
    assertUniqueIds("capability request", idsOf(snapshot.capability_requests));

    const branchIds = new Set(idsOf(snapshot.branches));
    for (const task of snapshot.tasks) {
        assertRelatedEntity("task", task.id, "branch", task.branch_id, branchIds);
    }
    const claimIds = new Set(idsOf(snapshot.claims));
    for (const claim of snapshot.claims) {
        assertRelatedEntity("claim", claim.id, "branch", claim.branch_id, branchIds);
        assertUniqueIds(`dependency of claim ${claim.id}`, claim.assumption_ids);
        for (const dependencyId of claim.assumption_ids) {
            if (dependencyId === claim.id) {
                throw new Error(`Claim ${claim.id} cannot depend on itself`);
            }
            assertRelatedEntity("claim", claim.id, "claim", dependencyId, claimIds);
        }
    }
}

function assertRelatedEntity(
    entityKind: string,
    entityId: string,
    relationKind: string,
    relationId: string,
    availableIds: ReadonlySet<string>
): void {
    if (!availableIds.has(relationId)) {
        throw new Error(
            `${entityKind} ${entityId} references missing ${relationKind} ${relationId}`
        );
    }
}

function assertUniqueIds(entityKind: string, ids: readonly string[]): void {
    if (new Set(ids).size !== ids.length) {
        throw new Error(`Runtime snapshot contains duplicate ${entityKind} identifiers`);
    }
}

function assertUpserted(
    records: readonly { readonly id: string }[],
    kind: string,
    id: string
): void {
    if (records.length !== 1) {
        throw new Error(`Failed to project ${kind} ${id}`);
    }
}

function idsOf(records: readonly { readonly id: string }[]): string[] {
    return records.map(({ id }) => id);
}
