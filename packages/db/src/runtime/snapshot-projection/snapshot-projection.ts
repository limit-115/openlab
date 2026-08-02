import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { upsertAttempts } from "#src/runtime/snapshot-projection/attempt-projection";
import {
    deleteMissingBranches,
    upsertBranches
} from "#src/runtime/snapshot-projection/branch-projection";
import {
    deleteMissingCapabilities,
    upsertCapabilities
} from "#src/runtime/snapshot-projection/capability-projection";
import {
    deleteMissingClaims,
    replaceClaimDependencies,
    upsertClaims
} from "#src/runtime/snapshot-projection/claim-projection";
import {
    deleteMissingEvidence,
    replaceClaimEvidence,
    upsertEvidence
} from "#src/runtime/snapshot-projection/evidence-projection";
import { assertEntityOwnership } from "#src/runtime/snapshot-projection/lab-ownership-integrity";
import { idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";
import { assertProjectionRelationships } from "#src/runtime/snapshot-projection/snapshot-relationship-integrity";
import { deleteMissingTasks, upsertTasks } from "#src/runtime/snapshot-projection/task-projection";

export async function projectRuntimeSnapshot(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[] = []
): Promise<void> {
    assertProjectionRelationships(snapshot, evidenceRecords);
    const labId = snapshot.lab.id;
    const projectionAt = new Date(snapshot.lab.updated_at);

    await assertEntityOwnership(database, snapshot, evidenceRecords);
    await upsertBranches(database, snapshot, projectionAt);
    await upsertTasks(database, snapshot, projectionAt);
    await upsertClaims(database, snapshot);
    await replaceClaimDependencies(database, snapshot);
    await upsertAttempts(database, snapshot, projectionAt);
    await upsertEvidence(database, snapshot, evidenceRecords);
    await replaceClaimEvidence(database, snapshot, evidenceRecords);
    await upsertCapabilities(database, snapshot, projectionAt);

    await deleteMissingCapabilities(database, labId, idsOf(snapshot.capability_requests));
    await deleteMissingEvidence(database, labId, idsOf(evidenceRecords));
    await deleteMissingTasks(database, labId, idsOf(snapshot.tasks));
    await deleteMissingClaims(database, labId, idsOf(snapshot.claims));
    await deleteMissingBranches(database, labId, idsOf(snapshot.branches));
}
