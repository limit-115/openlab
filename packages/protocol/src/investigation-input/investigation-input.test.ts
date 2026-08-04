import { describe, expect, it } from "vitest";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { DEFAULT_HARNESS_KINDS } from "#src/investigation-input/investigation-input.const";
import { InvestigationInputSchema } from "#src/investigation-input/investigation-input.schema";

describe("InvestigationInputSchema", () => {
    it("accepts a goal and supplies optional collection defaults", () => {
        expect(InvestigationInputSchema.parse({ goal: "Find a faster algorithm" })).toEqual({
            goal: "Find a faster algorithm",
            context: [],
            success_criteria: [],
            harness_kinds: [...DEFAULT_HARNESS_KINDS]
        });
    });

    it("keeps the roster the operator asked for, in the order they asked for it", () => {
        const input = InvestigationInputSchema.parse({
            goal: "Find a faster algorithm",
            harness_kinds: [AgentHarnessKind.GLM, AgentHarnessKind.CODEX]
        });

        expect(input.harness_kinds).toEqual([AgentHarnessKind.GLM, AgentHarnessKind.CODEX]);
    });

    it("rejects an empty roster, which would leave nothing to dispatch to", () => {
        expect(() =>
            InvestigationInputSchema.parse({ goal: "Find a faster algorithm", harness_kinds: [] })
        ).toThrow();
    });

    it("rejects an empty goal", () => {
        expect(() => InvestigationInputSchema.parse({ goal: "  " })).toThrow();
    });
});
