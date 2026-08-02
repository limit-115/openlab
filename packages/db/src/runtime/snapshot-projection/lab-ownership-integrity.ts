import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { inArray } from "drizzle-orm";
import {
    attempts,
    branches,
    capabilityRequests,
    claims,
    evidence,
    tasks
} from "#src/lab-database/lab-schema";
import { idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

export async function assertEntityOwnership(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    evidenceRecords: readonly Evidence[]
): Promise<void> {
    const branchIds = idsOf(snapshot.branches);
    const taskIds = idsOf(snapshot.tasks);
    const claimIds = idsOf(snapshot.claims);
    const capabilityIds = idsOf(snapshot.capability_requests);
    const attemptIds = idsOf(snapshot.experiments);
    const evidenceIds = idsOf(evidenceRecords);
    const [
        ownedBranches,
        ownedTasks,
        ownedClaims,
        ownedCapabilities,
        ownedAttempts,
        ownedEvidence
    ] = await Promise.all([
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
                  .where(inArray(capabilityRequests.id, capabilityIds)),
        attemptIds.length === 0
            ? []
            : database
                  .select({ id: attempts.id, taskId: attempts.taskId })
                  .from(attempts)
                  .where(inArray(attempts.id, attemptIds)),
        evidenceIds.length === 0
            ? []
            : database
                  .select({ id: evidence.id, labId: evidence.labId })
                  .from(evidence)
                  .where(inArray(evidence.id, evidenceIds))
    ]);
    const foreign = [
        ...ownedBranches,
        ...ownedTasks,
        ...ownedClaims,
        ...ownedCapabilities,
        ...ownedEvidence
    ].find((record) => record.labId !== snapshot.lab.id);
    if (foreign !== undefined) {
        throw new Error(`Entity ${foreign.id} belongs to another lab`);
    }
    const snapshotTaskIds = new Set(taskIds);
    const foreignAttempt = ownedAttempts.find((record) => !snapshotTaskIds.has(record.taskId));
    if (foreignAttempt !== undefined) {
        throw new Error(`Attempt ${foreignAttempt.id} belongs to another lab`);
    }
}
