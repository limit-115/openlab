import type { StatusSnapshot } from "@nightlab/protocol/investigation-status/status-snapshot.types";
import { idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";

export function assertProjectionRelationships(snapshot: StatusSnapshot): void {
    assertUniqueIds("assumption", idsOf(snapshot.assumptions));
    assertUniqueIds("agent run", idsOf(snapshot.runs));
    assertUniqueIds("finding", idsOf(snapshot.findings));
    assertUniqueIds("verdict", idsOf(snapshot.verdicts));
    assertUniqueIds("capability request", idsOf(snapshot.capability_requests));

    const assumptionIds = new Set(idsOf(snapshot.assumptions));
    const runIds = new Set(idsOf(snapshot.runs));
    const findingIds = new Set(idsOf(snapshot.findings));

    for (const run of snapshot.runs) {
        if (run.assumption_id !== undefined) {
            assertRelatedEntity(
                "agent run",
                run.id,
                "assumption",
                run.assumption_id,
                assumptionIds
            );
        }
    }
    for (const finding of snapshot.findings) {
        assertRelatedEntity(
            "finding",
            finding.id,
            "assumption",
            finding.assumption_id,
            assumptionIds
        );
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
