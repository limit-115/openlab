import { describe, expect, it } from "vitest";
import { ClaimSchema } from "#src/claims/claim.schema";
import { ClaimStatus } from "#src/claims/claim-status.const";

describe("ClaimSchema", () => {
    it("does not infer supporting evidence", () => {
        const now = new Date().toISOString();
        const claim = ClaimSchema.parse({
            id: "claim-1",
            branch_id: "branch-1",
            statement: "The candidate is faster",
            status: ClaimStatus.PROPOSED,
            created_at: now,
            updated_at: now
        });

        expect(claim.supporting_evidence_ids).toEqual([]);
        expect(claim.contradicting_evidence_ids).toEqual([]);
    });
});
