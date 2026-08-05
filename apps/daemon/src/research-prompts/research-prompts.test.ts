import type { Assumption } from "@nightlab/protocol/assumptions/assumption.types";
import { AssumptionStatus } from "@nightlab/protocol/assumptions/assumption-status.const";
import type { Finding } from "@nightlab/protocol/findings/finding.types";
import { FindingStatus } from "@nightlab/protocol/findings/finding-status.const";
import { InvestigationInputSchema } from "@nightlab/protocol/investigation-input/investigation-input.schema";
import { describe, expect, it } from "vitest";
import {
    directorPrompt,
    researcherPrompt,
    verifierPrompt
} from "#src/research-prompts/research-prompts";
import { MISSING_CAPABILITY_POLICY } from "#src/research-prompts/research-prompts.const";

const task = InvestigationInputSchema.parse({
    goal: "Find a faster algorithm",
    success_criteria: ["Reproduce a speedup"]
});

const timestamp = "2026-08-03T00:00:00.000Z";

function assumption(overrides: Partial<Assumption> = {}): Assumption {
    return {
        id: "assumption-eviction",
        cycle: 0,
        statement: "The eviction order is the bottleneck",
        rationale: "Nobody measures eviction under this access pattern",
        status: AssumptionStatus.OPEN,
        created_at: timestamp,
        updated_at: timestamp,
        ...overrides
    };
}

function finding(overrides: Partial<Finding> = {}): Finding {
    return {
        id: "finding-1",
        assumption_id: "assumption-eviction",
        run_id: "run-researcher-1",
        claim: "Reordering eviction by recency removes the stall",
        work: "Patched the allocator and ran the workload forty times",
        artifact_paths: [],
        status: FindingStatus.UNVERIFIED,
        created_at: timestamp,
        ...overrides
    };
}

describe("research prompts", () => {
    it("tells the director what has already been spent and what came of it", () => {
        const spent = assumption({
            statement: "The bottleneck is lock contention",
            status: AssumptionStatus.EXHAUSTED,
            outcome: "Contention stayed flat under every load I could produce"
        });

        const withHistory = directorPrompt(task, [spent]);
        expect(withHistory).toContain("The bottleneck is lock contention");
        expect(withHistory).toContain("Contention stayed flat under every load I could produce");
        expect(directorPrompt(task, [])).not.toContain("Bets already spent");
    });

    it("gives a researcher its own bet and nobody else's", () => {
        const prompt = researcherPrompt(task, assumption());

        expect(prompt).toContain("The eviction order is the bottleneck");
        expect(prompt).not.toContain("lock contention");
    });

    it("hands the verifier the claim and the account behind it", () => {
        const prompt = verifierPrompt(task, assumption(), finding());

        expect(prompt).toContain("Reordering eviction by recency removes the stall");
        expect(prompt).toContain("Patched the allocator and ran the workload forty times");
        expect(prompt).toContain("The eviction order is the bottleneck");
    });

    it("mentions artifacts to the verifier only when the researcher left some", () => {
        expect(verifierPrompt(task, assumption(), finding())).not.toContain("Files the researcher");
        expect(
            verifierPrompt(task, assumption(), finding({ artifact_paths: ["bench.json"] }))
        ).toContain("bench.json");
    });

    it("requires concrete missing-resource requests without stopping available work", () => {
        const prompts = [
            directorPrompt(task, []),
            researcherPrompt(task, assumption()),
            verifierPrompt(task, assumption(), finding())
        ];

        expect(prompts.every((prompt) => prompt.includes(MISSING_CAPABILITY_POLICY))).toBe(true);
        expect(prompts.every((prompt) => prompt.includes("not permission"))).toBe(true);
    });
});
