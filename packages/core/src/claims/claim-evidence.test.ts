import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { describe, expect, it } from "vitest";
import { deduplicateEvidence } from "#src/claims/claim-evidence";
import type { AssessedEvidence } from "#src/claims/claim-evidence.types";
import { EvidenceOrigin } from "#src/claims/evidence-origin.const";

const now = "2026-08-02T00:00:00.000Z";

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

describe("claim evidence", () => {
    it("does not count the same run and artifact twice", () => {
        const first = evidence();
        const duplicate = evidence({ id: "evidence-2" });

        expect(deduplicateEvidence([first, duplicate])).toEqual([first]);
    });
});
