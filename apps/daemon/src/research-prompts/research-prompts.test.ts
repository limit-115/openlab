import type { Finding } from "@openlab/protocol/findings/finding.types";
import { FindingStatus } from "@openlab/protocol/findings/finding-status.const";
import { InvestigationInputSchema } from "@openlab/protocol/investigation-input/investigation-input.schema";
import type { Lead } from "@openlab/protocol/leads/lead.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";
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

function lead(overrides: Partial<Lead> = {}): Lead {
    return {
        id: "lead-eviction",
        cycle: 0,
        statement: "The eviction order is the bottleneck",
        rationale: "Nobody measures eviction under this access pattern",
        status: LeadStatus.OPEN,
        created_at: timestamp,
        updated_at: timestamp,
        ...overrides
    };
}

function finding(overrides: Partial<Finding> = {}): Finding {
    return {
        id: "finding-1",
        lead_id: "lead-eviction",
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
        const spent = lead({
            statement: "The bottleneck is lock contention",
            status: LeadStatus.EXHAUSTED,
            outcome: "Contention stayed flat under every load I could produce"
        });

        const withHistory = directorPrompt(task, [spent]);
        expect(withHistory).toContain("The bottleneck is lock contention");
        expect(withHistory).toContain("Contention stayed flat under every load I could produce");
        expect(directorPrompt(task, [])).not.toContain("Leads already spent");
    });

    it("gives a researcher its own lead and nobody else's", () => {
        const prompt = researcherPrompt(task, lead());

        expect(prompt).toContain("The eviction order is the bottleneck");
        expect(prompt).not.toContain("lock contention");
    });

    it("hands the verifier the claim and the account behind it", () => {
        const prompt = verifierPrompt(task, lead(), finding());

        expect(prompt).toContain("Reordering eviction by recency removes the stall");
        expect(prompt).toContain("Patched the allocator and ran the workload forty times");
        expect(prompt).toContain("The eviction order is the bottleneck");
    });

    it("mentions artifacts to the verifier only when the researcher left some", () => {
        expect(verifierPrompt(task, lead(), finding())).not.toContain("Files the researcher");
        expect(verifierPrompt(task, lead(), finding({ artifact_paths: ["bench.json"] }))).toContain(
            "bench.json"
        );
    });

    it("requires concrete missing-resource requests without stopping available work", () => {
        const prompts = [
            directorPrompt(task, []),
            researcherPrompt(task, lead()),
            verifierPrompt(task, lead(), finding())
        ];

        expect(prompts.every((prompt) => prompt.includes(MISSING_CAPABILITY_POLICY))).toBe(true);
        expect(prompts.every((prompt) => prompt.includes("not permission"))).toBe(true);
    });
});
