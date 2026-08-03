import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { inArray } from "drizzle-orm";
import {
    agentRuns,
    assumptions,
    capabilityRequests,
    findings,
    verdicts
} from "#src/lab-database/lab-schema";
import { idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

/**
 * An identifier already used by another lab would be silently reassigned by an upsert. Every
 * projected table is keyed by its own id, so ownership is checked before anything is written.
 */
export async function assertEntityOwnership(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    const assumptionIds = idsOf(snapshot.assumptions);
    const runIds = idsOf(snapshot.runs);
    const findingIds = idsOf(snapshot.findings);
    const verdictIds = idsOf(snapshot.verdicts);
    const capabilityIds = idsOf(snapshot.capability_requests);
    const [ownedAssumptions, ownedRuns, ownedFindings, ownedVerdicts, ownedCapabilities] =
        await Promise.all([
            assumptionIds.length === 0
                ? []
                : database
                      .select({ id: assumptions.id, labId: assumptions.labId })
                      .from(assumptions)
                      .where(inArray(assumptions.id, assumptionIds)),
            runIds.length === 0
                ? []
                : database
                      .select({ id: agentRuns.id, labId: agentRuns.labId })
                      .from(agentRuns)
                      .where(inArray(agentRuns.id, runIds)),
            findingIds.length === 0
                ? []
                : database
                      .select({ id: findings.id, labId: findings.labId })
                      .from(findings)
                      .where(inArray(findings.id, findingIds)),
            verdictIds.length === 0
                ? []
                : database
                      .select({ id: verdicts.id, labId: verdicts.labId })
                      .from(verdicts)
                      .where(inArray(verdicts.id, verdictIds)),
            capabilityIds.length === 0
                ? []
                : database
                      .select({ id: capabilityRequests.id, labId: capabilityRequests.labId })
                      .from(capabilityRequests)
                      .where(inArray(capabilityRequests.id, capabilityIds))
        ]);
    const foreign = [
        ...ownedAssumptions,
        ...ownedRuns,
        ...ownedFindings,
        ...ownedVerdicts,
        ...ownedCapabilities
    ].find((record) => record.labId !== snapshot.lab.id);
    if (foreign !== undefined) {
        throw new Error(`Entity ${foreign.id} belongs to another lab`);
    }
}
