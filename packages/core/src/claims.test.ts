import type { Claim, Evidence } from "@lab/protocol/schemas";
import { describe, expect, it } from "vitest";
import {
    type AssessedEvidence,
    assessClaimPromotion,
    collectStaleDependents,
    deduplicateEvidence,
    transitionClaim
} from "#src/claims";

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
            kind: "experiment",
            claim_id: "claim-1",
            run_id: "run-1",
            artifact_hash: "sha256:one",
            summary: "Measured result",
            supports: true,
            independent: false,
            created_at: now,
            ...overrides
        },
        origin: "empirical",
        sourceBranchId: "solution-branch",
        valid: true,
        complete: true,
        reproducible: true
    };
}

describe("claim promotion", () => {
    it("rejects model judgement as the only support", () => {
        const decision = assessClaimPromotion(claim("testing"), "supported", [
            { ...evidence(), origin: "model_judgement" }
        ]);

        expect(decision.allowed).toBe(false);
        expect(decision.reasons).toContain("Model judgement alone cannot support a claim");
    });

    it("requires a reproducible verifier result from another branch", () => {
        const verifier = evidence({ kind: "verifier_result" });
        const decision = assessClaimPromotion(claim("supported"), "reproduced", [
            {
                ...verifier,
                origin: "verifier",
                sourceBranchId: "independent-verifier",
                evidence: { ...verifier.evidence, independent: true }
            }
        ]);

        expect(decision.allowed).toBe(true);
    });

    it("does not count the same run and artifact twice", () => {
        const first = evidence();
        const duplicate = evidence({ id: "evidence-2" });

        expect(deduplicateEvidence([first, duplicate])).toEqual([first]);
    });

    it("propagates refuted assumptions through dependent claims", () => {
        const stale = collectStaleDependents(new Set(["assumption-1"]), [
            { claimId: "claim-1", dependencyIds: ["assumption-1"] },
            { claimId: "claim-2", dependencyIds: ["claim-1"] },
            { claimId: "claim-3", dependencyIds: ["other"] }
        ]);

        expect([...stale]).toEqual(["claim-1", "claim-2"]);
    });

    it("allows a stale claim to re-enter testing and clears stale state", () => {
        const transitioned = transitionClaim(
            claim("supported", true),
            "testing",
            [],
            "2026-08-02T01:00:00.000Z"
        );

        expect(transitioned.status).toBe("testing");
        expect(transitioned.stale).toBe(false);
    });
});
