import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { HarnessAllowanceState } from "@openlab/protocol/harness-allowance/harness-allowance.const";
import type { HarnessAllowanceRoster } from "@openlab/protocol/harness-allowance/harness-allowance.types";
import { describe, expect, it } from "vitest";
import { allowanceReadingTime } from "#src/allowance-panel/allowance-reading-time";

function readAt(harness: AgentHarnessKind, read_at: string): HarnessAllowanceRoster[number] {
    return {
        harness,
        state: HarnessAllowanceState.AVAILABLE,
        plan: "max",
        windows: [],
        balances: [],
        error: null,
        read_at
    };
}

describe("allowanceReadingTime", () => {
    it("dates the page by the vendor that answered longest ago", () => {
        const roster = [
            readAt(AgentHarnessKind.CODEX, "2026-08-03T12:04:00.000Z"),
            readAt(AgentHarnessKind.CLAUDE, "2026-08-03T11:31:00.000Z"),
            readAt(AgentHarnessKind.GLM, "2026-08-03T12:04:00.000Z")
        ];

        expect(allowanceReadingTime(roster)).toBe("2026-08-03T11:31:00.000Z");
    });

    it("has no reading time to give when no harness was read", () => {
        expect(allowanceReadingTime([])).toBeUndefined();
    });
});
