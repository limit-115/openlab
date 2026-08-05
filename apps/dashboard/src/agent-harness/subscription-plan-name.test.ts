import { describe, expect, it } from "vitest";
import { subscriptionPlanName } from "#src/agent-harness/subscription-plan-name";

describe("subscriptionPlanName", () => {
    it("raises a tier the vendor reported in lower case", () => {
        expect(subscriptionPlanName("max")).toBe("Max");
    });

    /** The vendor already said how its product is spelled, and title case would rewrite it. */
    it("leaves a tier the vendor spelled out alone", () => {
        expect(subscriptionPlanName("ChatGPT Pro")).toBe("ChatGPT Pro");
    });
});
