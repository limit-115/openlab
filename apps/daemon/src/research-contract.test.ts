import { describe, expect, it } from "vitest";
import {
    DirectorPlanSchema,
    RESEARCH_OUTCOME,
    ResearchResultSchema,
    structuredOutputSchema
} from "#src/research-contract";

describe("research structured-output contracts", () => {
    it("requires at least two independent directions", () => {
        expect(() =>
            DirectorPlanSchema.parse({
                operational_goal: "Measure an improvement",
                assumptions: [],
                claims: [
                    {
                        statement: "The candidate is faster",
                        evaluator: "Benchmark",
                        success_condition: "Lower median time"
                    }
                ],
                directions: []
            })
        ).toThrow();
    });

    it("uses finite result outcomes", () => {
        const result = ResearchResultSchema.parse({
            summary: "The benchmark supports the hypothesis",
            hypothesis: "The candidate reduces allocations",
            outcome: RESEARCH_OUTCOME.SUPPORTED,
            evidence: [],
            limitations: [],
            next_experiments: []
        });

        expect(result.outcome).toBe(RESEARCH_OUTCOME.SUPPORTED);
    });

    it("produces a JSON Schema accepted by CLI harnesses", () => {
        expect(structuredOutputSchema(DirectorPlanSchema)).toMatchObject({ type: "object" });
    });
});
