import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import {
    deleteMissingAgentRuns,
    upsertAgentRuns
} from "#src/runtime/snapshot-projection/agent-run-projection";
import {
    deleteMissingAssumptions,
    upsertAssumptions
} from "#src/runtime/snapshot-projection/assumption-projection";
import {
    deleteMissingCapabilities,
    upsertCapabilities
} from "#src/runtime/snapshot-projection/capability-projection";
import {
    deleteMissingFindings,
    upsertFindings
} from "#src/runtime/snapshot-projection/finding-projection";
import { assertEntityOwnership } from "#src/runtime/snapshot-projection/lab-ownership-integrity";
import { idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";
import { assertProjectionRelationships } from "#src/runtime/snapshot-projection/snapshot-relationship-integrity";
import {
    deleteMissingVerdicts,
    upsertVerdicts
} from "#src/runtime/snapshot-projection/verdict-projection";

/**
 * Writes are ordered by foreign key: a run needs its assumption, a finding needs its run, a verdict
 * needs its finding. Deletes run the other way around for the same reason.
 */
export async function projectRuntimeSnapshot(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    assertProjectionRelationships(snapshot);
    const labId = snapshot.lab.id;
    const projectionAt = new Date(snapshot.lab.updated_at);

    await assertEntityOwnership(database, snapshot);
    await upsertAssumptions(database, snapshot);
    await upsertAgentRuns(database, snapshot, projectionAt);
    await upsertFindings(database, snapshot);
    await upsertVerdicts(database, snapshot);
    await upsertCapabilities(database, snapshot, projectionAt);

    await deleteMissingCapabilities(database, labId, idsOf(snapshot.capability_requests));
    await deleteMissingVerdicts(database, labId, idsOf(snapshot.verdicts));
    await deleteMissingFindings(database, labId, idsOf(snapshot.findings));
    await deleteMissingAgentRuns(database, labId, idsOf(snapshot.runs));
    await deleteMissingAssumptions(database, labId, idsOf(snapshot.assumptions));
}
