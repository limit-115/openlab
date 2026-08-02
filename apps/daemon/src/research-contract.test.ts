import { describe, expect, it } from "vitest";
import {
    DirectorPlanSchema,
    directorPlanSchema,
    RESEARCH_OUTCOME,
    RESEARCH_TARGET_KIND,
    ResearchResultSchema,
    structuredOutputSchema
} from "#src/research-contract";

const DirectorPlanFixture = {
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
            title: "Caching",
            approach: "Cache repeated lookups",
            rationale: "Repeated lookups may dominate runtime",
            objective: "Measure cached lookup"
        }
    ]
} as const;

describe("research structured-output contracts", () => {
    it("requires a falsifiable assumption when the task supplies no success criteria", () => {
        const schema = directorPlanSchema({ success_criteria: [] });

        expect(() => schema.parse(DirectorPlanFixture)).toThrow(/explicit falsifiable assumption/);
        expect(
            schema.parse({
                ...DirectorPlanFixture,
                assumptions: [
                    {
                        statement: "The benchmark workload is representative",
                        reason: "The result must generalize beyond a synthetic microbenchmark",
                        risk: "A narrow workload could produce a misleading speedup",
                        falsification_test: "Repeat the benchmark on a disjoint workload"
                    }
                ]
            }).assumptions
        ).toHaveLength(1);
    });

    it("preserves optional assumptions when the task already supplies success criteria", () => {
        expect(
            directorPlanSchema({ success_criteria: ["Reproduce the measured speedup"] }).parse(
                DirectorPlanFixture
            ).assumptions
        ).toEqual([]);
    });

    it("publishes the task-dependent assumption minimum to harness JSON Schema", () => {
        expect(structuredOutputSchema(directorPlanSchema({ success_criteria: [] }))).toMatchObject({
            properties: {
                assumptions: {
                    minItems: 1
                }
            }
        });
    });

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
        expect(result.capability_requests).toEqual([]);
        expect(result.capability_blocked).toBe(false);
    });

    it("requires a concrete request when a researcher reports a resource block", () => {
        expect(() =>
            ResearchResultSchema.parse({
                summary: "The required dataset is unavailable",
                hypothesis: "The dataset may contain the needed measurement",
                outcome: RESEARCH_OUTCOME.INCONCLUSIVE,
                evidence: [],
                limitations: ["No dataset"],
                next_experiments: [],
                capability_requests: [],
                capability_blocked: true
            })
        ).toThrow(/concrete capability request/);
    });

    it("produces a JSON Schema accepted by CLI harnesses", () => {
        expect(structuredOutputSchema(DirectorPlanSchema)).toMatchObject({ type: "object" });
    });
});
