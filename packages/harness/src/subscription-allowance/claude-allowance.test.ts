import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { claudeAllowanceFromUsage } from "#src/subscription-allowance/claude-allowance";
import { ClaudeWindowMinutes } from "#src/subscription-allowance/subscription-allowance.const";

const ClaudeUsagePayload = {
    five_hour: {
        utilization: 39,
        resets_at: "2026-08-03T17:39:59.116098+00:00",
        limit_dollars: null
    },
    seven_day: {
        utilization: 28,
        resets_at: "2026-08-08T06:59:59.116118+00:00",
        limit_dollars: null
    },
    seven_day_opus: null
} as const;

describe("claudeAllowanceFromUsage", () => {
    it("states how long each window runs, which the endpoint names only by field", () => {
        const allowance = claudeAllowanceFromUsage(ClaudeUsagePayload, "max");

        expect(allowance).toMatchObject({ kind: HarnessKinds.CLAUDE, plan: "max" });
        expect(allowance.windows.map((window) => window.durationMinutes)).toEqual([
            ClaudeWindowMinutes.FIVE_HOUR,
            ClaudeWindowMinutes.SEVEN_DAY
        ]);
    });

    it("narrows a microsecond reset time with an offset to one millisecond UTC instant", () => {
        const allowance = claudeAllowanceFromUsage(ClaudeUsagePayload, "max");

        expect(allowance.windows[0]?.resetsAt).toBe("2026-08-03T17:39:59.116Z");
    });

    it("leaves out a window the plan is not metered on instead of reporting it unused", () => {
        const allowance = claudeAllowanceFromUsage(
            { ...ClaudeUsagePayload, seven_day: null },
            "max"
        );

        expect(allowance.windows).toHaveLength(1);
        expect(allowance.windows[0]?.usedPercent).toBe(39);
    });

    it("carries a subscription with no tier named rather than failing the reading", () => {
        const allowance = claudeAllowanceFromUsage(ClaudeUsagePayload, null);

        expect(allowance.plan).toBeNull();
        expect(allowance.windows).toHaveLength(2);
    });
});
