import type { Claim } from "@lab/protocol/claims/claim.types";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { describe, expect, it } from "vitest";
import type { AssessedEvidence } from "#src/claims/claim-evidence.types";
import { assessClaimPromotion, transitionClaim } from "#src/claims/claim-promotion";
import { EvidenceOrigin } from "#src/claims/evidence-origin.const";

const now = "2026-08-02T00:00:00.000Z";

function claim(status: Claim["status"], stale = false): Claim {
    return {
        id: "claim-1",
        branch_id: "solution-branch",
        statement: "The candidate is faster",
        status,
        assumption_ids: [],
        supporting_evidence_ids: [],
        contradicting_evidence_ids: [],
        stale,
        created_at: now,
        updated_at: now
    };
}

function evidence(overrides: Partial<Evidence> = {}): AssessedEvidence {
    return {
        evidence: {
            id: "evidence-1",
            kind: EvidenceKind.EXPERIMENT,
            claim_id: "claim-1",
            run_id: "run-1",
            artifact_hash: "sha256:one",
            summary: "Measured result",
            supports: true,
            independent: false,
            created_at: now,
            ...overrides
        },
        origin: EvidenceOrigin.EMPIRICAL,
        sourceBranchId: "solution-branch",
        valid: true,
        complete: true,
        reproducible: true
    };
}

describe("claim promotion", () => {
    it("rejects model judgement as the only support", () => {
        const decision = assessClaimPromotion(claim(ClaimStatus.TESTING), ClaimStatus.SUPPORTED, [
            { ...evidence(), origin: EvidenceOrigin.MODEL_JUDGEMENT }
        ]);

        expect(decision.allowed).toBe(false);
        expect(decision.reasons).toContain("Model judgement alone cannot support a claim");
    });

    it("requires a reproducible verifier result from another branch", () => {
        const verifier = evidence({ kind: EvidenceKind.VERIFIER_RESULT });
        const decision = assessClaimPromotion(
            claim(ClaimStatus.SUPPORTED),
            ClaimStatus.REPRODUCED,
            [
                {
                    ...verifier,
                    origin: EvidenceOrigin.VERIFIER,
                    sourceBranchId: "independent-verifier",
                    evidence: { ...verifier.evidence, independent: true }
                }
            ]
        );

        expect(decision.allowed).toBe(true);
    });

    it("allows a stale claim to re-enter testing and clears stale state", () => {
        const transitioned = transitionClaim(
            claim(ClaimStatus.SUPPORTED, true),
            ClaimStatus.TESTING,
            [],
            "2026-08-02T01:00:00.000Z"
        );

        expect(transitioned.status).toBe(ClaimStatus.TESTING);
        expect(transitioned.stale).toBe(false);
    });
});
