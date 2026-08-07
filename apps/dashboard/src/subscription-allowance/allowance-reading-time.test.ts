import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { SubscriptionAllowanceState } from "@openlab/protocol/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowanceRoster } from "@openlab/protocol/subscription-allowance/subscription-allowance.types";
import { describe, expect, it } from "vitest";
import { allowanceReadingTime } from "#src/subscription-allowance/allowance-reading-time";

function readAt(harness: AgentHarnessKind, read_at: string): SubscriptionAllowanceRoster[number] {
    return {
        harness,
        state: SubscriptionAllowanceState.AVAILABLE,
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

    it("has no reading time to give when no subscription was read", () => {
        expect(allowanceReadingTime([])).toBeUndefined();
    });
});
