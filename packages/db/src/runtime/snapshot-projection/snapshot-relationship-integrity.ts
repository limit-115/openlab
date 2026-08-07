import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";

export function assertProjectionRelationships(snapshot: StatusSnapshot): void {
    assertUniqueIds("lead", idsOf(snapshot.leads));
    assertUniqueIds("agent run", idsOf(snapshot.runs));
    assertUniqueIds("finding", idsOf(snapshot.findings));
    assertUniqueIds("verdict", idsOf(snapshot.verdicts));
    assertUniqueIds("capability request", idsOf(snapshot.capability_requests));

    const leadIds = new Set(idsOf(snapshot.leads));
    const runIds = new Set(idsOf(snapshot.runs));
    const findingIds = new Set(idsOf(snapshot.findings));

    for (const run of snapshot.runs) {
        if (run.lead_id !== undefined) {
            assertRelatedEntity("agent run", run.id, "lead", run.lead_id, leadIds);
        }
    }
    for (const finding of snapshot.findings) {
        assertRelatedEntity("finding", finding.id, "lead", finding.lead_id, leadIds);
        assertRelatedEntity("finding", finding.id, "agent run", finding.run_id, runIds);
    }
    for (const verdict of snapshot.verdicts) {
        assertRelatedEntity("verdict", verdict.id, "finding", verdict.finding_id, findingIds);
        assertRelatedEntity("verdict", verdict.id, "agent run", verdict.run_id, runIds);
    }
    if (snapshot.breakthrough_finding_id !== undefined) {
        assertRelatedEntity(
            "investigation",
            snapshot.investigation.id,
            "finding",
            snapshot.breakthrough_finding_id,
            findingIds
        );
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
