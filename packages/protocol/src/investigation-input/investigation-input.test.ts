import { describe, expect, it } from "vitest";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { DEFAULT_HARNESS_KINDS } from "#src/investigation-input/investigation-input.const";
import {
    InvestigationInputSchema,
    InvestigationRequestSchema
} from "#src/investigation-input/investigation-input.schema";

describe("InvestigationRequestSchema", () => {
    it("accepts a goal and leaves the roster for the lab to fill in", () => {
        expect(InvestigationRequestSchema.parse({ goal: "Find a faster algorithm" })).toEqual({
            goal: "Find a faster algorithm",
            context: [],
            success_criteria: [],
            spend_past_caps: false
        });
    });

    it("holds a new investigation to the lab's spend caps until the operator lifts them", () => {
        expect(
            InvestigationRequestSchema.parse({
                goal: "Find a faster algorithm",
                spend_past_caps: true
            }).spend_past_caps
        ).toBe(true);
    });

    it("keeps the roster the operator asked for, in the order they asked for it", () => {
        const request = InvestigationRequestSchema.parse({
            goal: "Find a faster algorithm",
            harness_kinds: [AgentHarnessKind.GLM, AgentHarnessKind.CODEX]
        });

        expect(request.harness_kinds).toEqual([AgentHarnessKind.GLM, AgentHarnessKind.CODEX]);
    });

    it("rejects an empty roster, which would leave nothing to dispatch to", () => {
        expect(() =>
            InvestigationRequestSchema.parse({ goal: "Find a faster algorithm", harness_kinds: [] })
        ).toThrow();
    });

    it("rejects an empty goal", () => {
        expect(() => InvestigationRequestSchema.parse({ goal: "  " })).toThrow();
    });
});

describe("InvestigationInputSchema", () => {
    it("settles the roster of what the lab holds, so a stored investigation always names one", () => {
        expect(InvestigationInputSchema.parse({ goal: "Find a faster algorithm" })).toEqual({
            goal: "Find a faster algorithm",
            context: [],
            success_criteria: [],
            harness_kinds: [...DEFAULT_HARNESS_KINDS],
            spend_past_caps: false
        });
    });
});
