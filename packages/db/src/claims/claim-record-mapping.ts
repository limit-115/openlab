import type { AssessedEvidence } from "@lab/core/claims/claim-evidence.types";
import type { Claim } from "@lab/protocol/claims/claim.types";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import type { claims, evidence } from "#src/lab-database/lab-schema";

export function toClaim(
    record: typeof claims.$inferSelect,
    dependencyIds: readonly string[],
    supportingEvidenceIds: readonly string[],
    contradictingEvidenceIds: readonly string[]
): Claim {
    return {
        id: record.id,
        branch_id: record.branchId,
        statement: record.statement,
        status: record.status,
        assumption_ids: [...dependencyIds],
        supporting_evidence_ids: [...supportingEvidenceIds],
        contradicting_evidence_ids: [...contradictingEvidenceIds],
        stale: record.stale,
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString()
    };
}

export function toAssessedEvidence(
    claimId: string,
    stored: typeof evidence.$inferSelect,
    supports: boolean
): AssessedEvidence {
    const protocolEvidence: Evidence = {
        id: stored.id,
        kind: stored.kind,
        claim_id: claimId,
        summary: stored.summary,
        supports,
        independent: stored.independent,
        created_at: stored.createdAt.toISOString(),
        ...(stored.runId === null ? {} : { run_id: stored.runId }),
        ...(stored.artifactPath === null ? {} : { artifact_path: stored.artifactPath }),
        ...(stored.artifactHash === null ? {} : { artifact_hash: stored.artifactHash })
    };
    return {
        evidence: protocolEvidence,
        origin: stored.origin,
        sourceBranchId: stored.sourceBranchId,
        valid: stored.valid,
        complete: stored.complete,
        reproducible: stored.reproducible
    };
}
