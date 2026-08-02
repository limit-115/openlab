import type { Evidence } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { assertUniqueEvidenceFingerprints } from "#src/runtime/snapshot-projection/evidence-fingerprint";
import { idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";

export function assertProjectionRelationships(
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[]
): void {
    assertUniqueIds("branch", idsOf(snapshot.branches));
    assertUniqueIds("task", idsOf(snapshot.tasks));
    assertUniqueIds("claim", idsOf(snapshot.claims));
    assertUniqueIds("experiment", idsOf(snapshot.experiments));
    assertUniqueIds("evidence", idsOf(evidenceRecords));
    assertUniqueEvidenceFingerprints(evidenceRecords);
    assertUniqueIds("capability request", idsOf(snapshot.capability_requests));

    const branchIds = new Set(idsOf(snapshot.branches));
    const tasksById = new Map(snapshot.tasks.map((task) => [task.id, task]));
    for (const task of snapshot.tasks) {
        assertRelatedEntity("task", task.id, "branch", task.branch_id, branchIds);
    }
    for (const experiment of snapshot.experiments) {
        assertRelatedEntity(
            "experiment",
            experiment.id,
            "task",
            experiment.task_id,
            new Set(tasksById.keys())
        );
        const task = tasksById.get(experiment.task_id);
        if (task !== undefined && experiment.branch_id !== task.branch_id) {
            throw new Error(
                `Experiment ${experiment.id} belongs to branch ${experiment.branch_id}, but its task belongs to ${task.branch_id}`
            );
        }
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
    for (const candidate of evidenceRecords) {
        assertRelatedEntity("evidence", candidate.id, "claim", candidate.claim_id, claimIds);
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
