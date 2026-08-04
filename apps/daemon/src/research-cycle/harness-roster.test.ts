import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { DEFAULT_HARNESS_KINDS } from "@lab/protocol/investigation-input/investigation-input.const";
import { describe, expect, it } from "vitest";
import { createHarnesses } from "#src/research-cycle/harness-roster";

describe("createHarnesses", () => {
    it("keeps the roster order, because the order is the rotation stages walk", () => {
        expect(createHarnesses(DEFAULT_HARNESS_KINDS).map(({ kind }) => kind)).toEqual([
            AgentHarnessKind.CODEX,
            AgentHarnessKind.CLAUDE,
            AgentHarnessKind.GLM
        ]);
    });

    it("builds only what a pinned roster names, leaving nothing to rotate onto", () => {
        expect(createHarnesses([AgentHarnessKind.GLM]).map(({ kind }) => kind)).toEqual([
            AgentHarnessKind.GLM
        ]);
    });
});
