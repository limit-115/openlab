import { describe, expect, it } from "vitest";
import { collectStaleDependents } from "#src/claims/claim-staleness";

describe("claim staleness", () => {
    it("propagates refuted assumptions through dependent claims", () => {
        const stale = collectStaleDependents(new Set(["assumption-1"]), [
            { claimId: "claim-1", dependencyIds: ["assumption-1"] },
            { claimId: "claim-2", dependencyIds: ["claim-1"] },
            { claimId: "claim-3", dependencyIds: ["other"] }
        ]);

        expect([...stale]).toEqual(["claim-1", "claim-2"]);
    });
});
