import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { inArray } from "drizzle-orm";
import {
    agentRuns,
    capabilityRequests,
    findings,
    leads,
    verdicts
} from "#src/lab-database/lab-schema";
import { idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";

/**
 * An identifier already used by another investigation would be silently reassigned by an upsert. Every
 * projected table is keyed by its own id, so ownership is checked before anything is written.
 */
export async function assertEntityOwnership(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot
): Promise<void> {
    const leadIds = idsOf(snapshot.leads);
    const runIds = idsOf(snapshot.runs);
    const findingIds = idsOf(snapshot.findings);
    const verdictIds = idsOf(snapshot.verdicts);
    const capabilityIds = idsOf(snapshot.capability_requests);
    const [ownedLeads, ownedRuns, ownedFindings, ownedVerdicts, ownedCapabilities] =
        await Promise.all([
            leadIds.length === 0
                ? []
                : database
                      .select({ id: leads.id, investigationId: leads.investigationId })
                      .from(leads)
                      .where(inArray(leads.id, leadIds)),
            runIds.length === 0
                ? []
                : database
                      .select({ id: agentRuns.id, investigationId: agentRuns.investigationId })
                      .from(agentRuns)
                      .where(inArray(agentRuns.id, runIds)),
            findingIds.length === 0
                ? []
                : database
                      .select({ id: findings.id, investigationId: findings.investigationId })
                      .from(findings)
                      .where(inArray(findings.id, findingIds)),
            verdictIds.length === 0
                ? []
                : database
                      .select({ id: verdicts.id, investigationId: verdicts.investigationId })
                      .from(verdicts)
                      .where(inArray(verdicts.id, verdictIds)),
            capabilityIds.length === 0
                ? []
                : database
                      .select({
                          id: capabilityRequests.id,
                          investigationId: capabilityRequests.investigationId
                      })
                      .from(capabilityRequests)
                      .where(inArray(capabilityRequests.id, capabilityIds))
        ]);
    const foreign = [
        ...ownedLeads,
        ...ownedRuns,
        ...ownedFindings,
        ...ownedVerdicts,
        ...ownedCapabilities
    ].find((record) => record.investigationId !== snapshot.investigation.id);
    if (foreign !== undefined) {
        throw new Error(`Entity ${foreign.id} belongs to another investigation`);
    }
}
