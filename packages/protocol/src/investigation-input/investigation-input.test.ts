import { describe, expect, it } from "vitest";
import { InvestigationInputSchema } from "#src/investigation-input/investigation-input.schema";

describe("InvestigationInputSchema", () => {
    it("accepts a goal and supplies optional collection defaults", () => {
        expect(InvestigationInputSchema.parse({ goal: "Find a faster algorithm" })).toEqual({
            goal: "Find a faster algorithm",
            context: [],
            success_criteria: []
        });
    });

    it("rejects an empty goal", () => {
        expect(() => InvestigationInputSchema.parse({ goal: "  " })).toThrow();
    });
});
