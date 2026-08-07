import { describe, expect, it } from "vitest";
import {
    DirectorPlanSchema,
    ResearchResultSchema,
    VerificationResultSchema
} from "#src/research-contract/research-contract";

describe("research structured-output contracts", () => {
    it("requires the director to bet on somewhere", () => {
        expect(() =>
            DirectorPlanSchema.parse({
                reconnaissance: "Read the allocator and its issue tracker",
                assumptions: []
            })
        ).toThrow();
        expect(
            DirectorPlanSchema.parse({
                reconnaissance: "Read the allocator and its issue tracker",
                assumptions: [
                    {
                        statement: "The eviction order is the bottleneck",
                        rationale: "Nobody measures eviction under this access pattern"
                    }
                ]
            }).capability_requests
        ).toEqual([]);
    });

    it("makes a researcher that found something say what it claims", () => {
        expect(() =>
            ResearchResultSchema.parse({
                found: true,
                work: "Patched the allocator and measured the workload"
            })
        ).toThrow(/must state what it claims/);
    });

    it("lets a bet that ran out close without a claim", () => {
        const empty = ResearchResultSchema.parse({
            found: false,
            work: "Reordered eviction three ways; the stall stayed within noise every time"
        });

        expect(empty.claim).toBeUndefined();
        expect(empty.artifact_paths).toEqual([]);
    });

    it("accepts a finding that produced no files", () => {
        expect(
            ResearchResultSchema.parse({
                found: true,
                claim: "The stall comes from the scheduler, not the allocator",
                work: "Traced both under load and the stall follows the scheduler queue"
            }).artifact_paths
        ).toEqual([]);
    });

    it("requires a concrete request when a researcher reports a resource block", () => {
        expect(() =>
            ResearchResultSchema.parse({
                found: false,
                work: "The held-out dataset is unavailable",
                capability_requests: [],
                capability_blocked: true
            })
        ).toThrow(/concrete capability request/);
    });

    it("keeps a verifier that could not run from confirming anything", () => {
        const blocked = {
            confirmed: false,
            meets_goal: false,
            reasoning: "Independent reproduction needs the held-out dataset",
            capability_requests: [
                {
                    need: "Held-out benchmark dataset",
                    reason: "Independent reproduction requires disjoint inputs",
                    provisioning_hint: "Attach a read-only dataset snapshot",
                    self_provisioning_attempt: "Sampled the public corpus, which overlaps training"
                }
            ],
            capability_blocked: true
        } as const;

        expect(VerificationResultSchema.parse(blocked).confirmed).toBe(false);
        expect(() => VerificationResultSchema.parse({ ...blocked, confirmed: true })).toThrow(
            /cannot confirm a finding/
        );
    });

    it("refuses to let an unconfirmed claim reach the goal", () => {
        expect(() =>
            VerificationResultSchema.parse({
                confirmed: false,
                meets_goal: true,
                reasoning: "The claim is unproven yet marked as reaching the goal",
                capability_requests: [],
                capability_blocked: false
            })
        ).toThrow(/cannot reach the goal/);
    });
});
