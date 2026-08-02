import { CapabilityResourceClass } from "@lab/protocol/capabilities/capability-request.const";
import { SourceClassification } from "@lab/protocol/evidence/source-evidence.const";
import { ExternalEffect } from "@lab/protocol/experiments/external-effect.const";
import { describe, expect, it } from "vitest";
import {
    DirectorPlanSchema,
    directorPlanSchema,
    ResearchResultSchema,
    structuredOutputSchema,
    VerifierResultSchema
} from "#src/research-contract/research-contract";
import {
    RESEARCH_OUTCOME,
    RESEARCH_TARGET_KIND,
    VERIFIER_VERDICT
} from "#src/research-contract/research-contract.const";

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
                    artifact_paths: [],
                    contradicts_hypothesis: true
                }
            ],
            execution_plan: {
                file: process.execPath,
                args: ["-e", "process.exit(0)"],
                declared_output_paths: ["result.json"],
                external_effect: ExternalEffect.NONE
            },
            limitations: [],
            next_experiments: []
        });

        expect(result.outcome).toBe(RESEARCH_OUTCOME.SUPPORTED);
        expect(result.evidence[0]?.target_kind).toBe(RESEARCH_TARGET_KIND.ASSUMPTION);
        expect(result.capability_requests).toEqual([]);
        expect(result.capability_blocked).toBe(false);
        expect(result.sources).toEqual([]);
    });

    it("accepts source-only citations only as an inconclusive non-empirical result", () => {
        const sourceOnly = {
            summary: "A relevant specification was identified",
            hypothesis: "The specification may constrain the implementation",
            outcome: RESEARCH_OUTCOME.INCONCLUSIVE,
            evidence: [],
            sources: [
                {
                    target_kind: RESEARCH_TARGET_KIND.CLAIM,
                    target_index: 0,
                    url: "https://example.com/specification",
                    title: "Example specification",
                    claimed_classification: SourceClassification.PRIMARY
                }
            ],
            limitations: ["The citation is not empirical evidence"],
            next_experiments: []
        } as const;

        expect(ResearchResultSchema.parse(sourceOnly).execution_plan).toBeUndefined();
        expect(() =>
            ResearchResultSchema.parse({
                ...sourceOnly,
                outcome: RESEARCH_OUTCOME.SUPPORTED
            })
        ).toThrow(/must remain inconclusive/);
    });

    it("rejects model-created artifact paths as empirical evidence", () => {
        expect(() =>
            ResearchResultSchema.parse({
                summary: "A model fabricated a result file",
                hypothesis: "The fabricated value supports the claim",
                outcome: RESEARCH_OUTCOME.SUPPORTED,
                evidence: [
                    {
                        target_kind: RESEARCH_TARGET_KIND.CLAIM,
                        target_index: 0,
                        summary: "Unattested JSON",
                        artifact_paths: ["fabricated.json"],
                        contradicts_hypothesis: false
                    }
                ],
                execution_plan: {
                    file: process.execPath,
                    args: [],
                    declared_output_paths: ["result.json"]
                },
                limitations: [],
                next_experiments: []
            })
        ).toThrow();
    });

    it("requires reconciliation identity for irreversible outcome plans", () => {
        expect(() =>
            ResearchResultSchema.parse({
                summary: "An irreversible action is planned",
                hypothesis: "The action may produce evidence",
                outcome: RESEARCH_OUTCOME.INCONCLUSIVE,
                evidence: [
                    {
                        target_kind: RESEARCH_TARGET_KIND.CLAIM,
                        target_index: 0,
                        summary: "Irreversible attempt",
                        artifact_paths: [],
                        contradicts_hypothesis: false
                    }
                ],
                execution_plan: {
                    file: process.execPath,
                    args: [],
                    declared_output_paths: ["result.json"],
                    external_effect: ExternalEffect.IRREVERSIBLE
                },
                limitations: [],
                next_experiments: []
            })
        ).toThrow(/stable reconciliation key/);
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

    it("lets a resource-blocked verifier request a capability without fabricating a plan", () => {
        const blockedVerifier = {
            verdict: VERIFIER_VERDICT.INCONCLUSIVE,
            claim_index: 0,
            result_statement: "Independent reproduction is blocked on a held-out dataset",
            evidence_artifact_paths: [],
            limitations: ["The held-out dataset is unavailable"],
            known_counterexamples: [],
            capability_requests: [
                {
                    need: "Held-out benchmark dataset",
                    resource_class: CapabilityResourceClass.PRIVATE_DATA,
                    reason: "Independent reproduction requires disjoint inputs",
                    provisioning_hint: "Attach a read-only dataset snapshot"
                }
            ],
            capability_blocked: true
        } as const;

        expect(VerifierResultSchema.parse(blockedVerifier).execution_plan).toBeUndefined();
        expect(() =>
            VerifierResultSchema.parse({
                ...blockedVerifier,
                capability_requests: []
            })
        ).toThrow(/concrete capability request/);
        expect(() =>
            VerifierResultSchema.parse({
                ...blockedVerifier,
                execution_plan: {
                    file: process.execPath,
                    args: [],
                    declared_output_paths: ["result.json"]
                }
            })
        ).toThrow(/cannot request outcome execution/);
    });

    it("produces a JSON Schema accepted by CLI harnesses", () => {
        expect(structuredOutputSchema(DirectorPlanSchema)).toMatchObject({ type: "object" });
    });
});
