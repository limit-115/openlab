import { describe, expect, it } from "vitest";
import {
    DirectorPlanSchema,
    RESEARCH_OUTCOME,
    RESEARCH_TARGET_KIND,
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

    it("rejects cosmetically different duplicate research directions", () => {
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
                directions: [
                    {
                        title: "Indexing",
                        approach: "Change the lookup index",
                        rationale: "Lookup dominates runtime",
                        objective: "Measure indexed lookup"
                    },
                    {
                        title: "A differently named duplicate",
                        approach: "  CHANGE--the lookup INDEX! ",
                        rationale: "A rewritten rationale cannot make the method independent",
                        objective: "measure indexed lookup."
                    }
                ]
            })
        ).toThrow(/duplicates normalized approach and objective/);
    });

    it("uses finite result outcomes", () => {
        const result = ResearchResultSchema.parse({
            summary: "The benchmark supports the hypothesis",
            hypothesis: "The candidate reduces allocations",
            outcome: RESEARCH_OUTCOME.SUPPORTED,
            evidence: [
                {
                    target_kind: RESEARCH_TARGET_KIND.ASSUMPTION,
                    target_index: 0,
                    summary: "A falsification attempt",
                    artifact_paths: ["result.json"],
                    contradicts_hypothesis: true
                }
            ],
            limitations: [],
            next_experiments: []
        });

        expect(result.outcome).toBe(RESEARCH_OUTCOME.SUPPORTED);
        expect(result.evidence[0]?.target_kind).toBe(RESEARCH_TARGET_KIND.ASSUMPTION);
    });

    it("produces a JSON Schema accepted by CLI harnesses", () => {
        expect(structuredOutputSchema(DirectorPlanSchema)).toMatchObject({ type: "object" });
    });
});
