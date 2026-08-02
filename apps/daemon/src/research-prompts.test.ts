import { describe, expect, it } from "vitest";
import { directorPrompt, researcherPrompt } from "#src/research-prompts";

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
                ]
            },
            {
                title: "Data structure",
                approach: "Change lookup structure",
                rationale: "Lookup dominates runtime",
                objective: "Measure lookup alternatives"
            }
        );

        expect(prompt).toContain("Data structure");
        expect(prompt).not.toContain("Vectorization");
    });
});
