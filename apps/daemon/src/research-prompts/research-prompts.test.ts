import { describe, expect, it } from "vitest";
import { EvaluatorStructuredVerdictSchema } from "#src/research-contract/research-contract";
import {
    CRITIC_VERDICT,
    EVALUATOR_VERDICT,
    RESEARCH_OUTCOME,
    RESEARCH_TARGET_KIND
} from "#src/research-contract/research-contract.const";
import {
    criticPrompt,
    directorPrompt,
    evaluatorPrecommitPrompt,
    researcherPrompt,
    verifierPrompt
} from "#src/research-prompts/research-prompts";
import {
    EVALUATOR_VERDICT_CONTRACT,
    MISSING_CAPABILITY_POLICY
} from "#src/research-prompts/research-prompts.const";

const task = {
    goal: "Find a faster algorithm",
    context: [],
    success_criteria: ["Reproduce a speedup"]
};

describe("research prompts", () => {
    it("asks the director for falsifiable independent work", () => {
        const prompt = directorPrompt(task);

        expect(prompt).toContain("falsifiable claims");
        expect(prompt).toContain("independent research");
        expect(prompt).toContain("materially distinct");
        expect(prompt).toContain("concrete falsification test");
    });

    it("gives a researcher only its isolated direction", () => {
        const prompt = researcherPrompt(
            task,
            {
                operational_goal: "Measure and reproduce a speedup",
                assumptions: [],
                claims: [
                    {
                        statement: "Candidate is faster",
                        evaluator: "Independent benchmark",
                        success_condition: "Lower median runtime"
                    }
                ],
                directions: [
                    {
                        title: "Data structure",
                        approach: "Change lookup structure",
                        rationale: "Lookup dominates runtime",
                        objective: "Measure lookup alternatives"
                    },
                    {
                        title: "Vectorization",
                        approach: "Batch operations",
                        rationale: "The workload is parallel",
                        objective: "Measure vectorized candidates"
                    }
                ],
                capability_requests: []
            },
            {
                title: "Data structure",
                approach: "Change lookup structure",
                rationale: "Lookup dominates runtime",
                objective: "Measure lookup alternatives"
            },
            [
                {
                    targetKind: RESEARCH_TARGET_KIND.CLAIM,
                    targetIndex: 0,
                    targetClaimId: "claim-1",
                    targetStatementSha256: "a".repeat(64),
                    file: "/tmp/evaluate",
                    fileSha256: "b".repeat(64),
                    args: [],
                    successContract: "Median runtime is lower"
                }
            ]
        );

        expect(prompt).toContain("Data structure");
        expect(prompt).not.toContain("Vectorization");
        expect(prompt).toContain("target_kind");
    });

    it("names every verdict field the daemon parses to whoever writes an evaluator", () => {
        const checks = EvaluatorStructuredVerdictSchema.shape.checks.element.shape;
        const contract = [
            ...Object.keys(EvaluatorStructuredVerdictSchema.shape),
            ...Object.keys(checks),
            ...Object.values(EVALUATOR_VERDICT)
        ];

        expect(contract.filter((field) => !EVALUATOR_VERDICT_CONTRACT.includes(field))).toEqual([]);
    });

    it("hands the verdict contract to both roles that write an evaluator", () => {
        const plan = {
            operational_goal: "Measure a speedup",
            assumptions: [],
            claims: [
                {
                    statement: "Candidate is faster",
                    evaluator: "Benchmark",
                    success_condition: "Lower runtime"
                }
            ],
            directions: [
                {
                    title: "Index",
                    approach: "Index lookup",
                    rationale: "Lookup is expensive",
                    objective: "Measure indexing"
                }
            ],
            capability_requests: []
        };
        const direction = plan.directions[0];
        if (direction === undefined) {
            throw new Error("Expected a research direction fixture");
        }

        expect(evaluatorPrecommitPrompt(task, plan, direction)).toContain(
            EVALUATOR_VERDICT_CONTRACT
        );
        expect(criticPrompt(task, plan, [])).toContain(EVALUATOR_VERDICT_CONTRACT);
    });

    it("requires concrete missing-resource requests without stopping available work", () => {
        const plan = {
            operational_goal: "Measure a speedup",
            assumptions: [],
            claims: [
                {
                    statement: "Candidate is faster",
                    evaluator: "Benchmark",
                    success_condition: "Lower runtime"
                }
            ],
            directions: [
                {
                    title: "Index",
                    approach: "Index lookup",
                    rationale: "Lookup is expensive",
                    objective: "Measure indexing"
                },
                {
                    title: "Batch",
                    approach: "Batch lookup",
                    rationale: "Calls are independent",
                    objective: "Measure batching"
                }
            ],
            capability_requests: []
        };
        const result = {
            summary: "Measured",
            hypothesis: "Faster",
            outcome: RESEARCH_OUTCOME.SUPPORTED,
            evidence: [],
            sources: [],
            limitations: [],
            next_experiments: [],
            capability_requests: [],
            capability_blocked: false
        };
        const criticism = {
            verdict: CRITIC_VERDICT.CREDIBLE,
            summary: "Credible",
            issues: [],
            counterexamples: [],
            claims_to_verify: ["Candidate is faster"],
            next_experiments: [],
            verification_evaluator: {
                target_kind: RESEARCH_TARGET_KIND.CLAIM,
                target_index: 0,
                evaluator_path: "verify",
                args: [],
                success_contract: "Lower runtime"
            },
            capability_requests: []
        };
        const direction = plan.directions[0];
        if (direction === undefined) {
            throw new Error("Expected a research direction fixture");
        }

        const prompts = [
            directorPrompt(task),
            researcherPrompt(task, plan, direction, []),
            criticPrompt(task, plan, [result]),
            verifierPrompt(task, plan, [result], criticism)
        ];

        expect(prompts.every((prompt) => prompt.includes(MISSING_CAPABILITY_POLICY))).toBe(true);
        expect(prompts.every((prompt) => prompt.includes("capability_requests"))).toBe(true);
        expect(prompts.every((prompt) => prompt.includes("not permission"))).toBe(true);
        expect(researcherPrompt(task, plan, direction, [])).toContain("capability_blocked");
    });
});
