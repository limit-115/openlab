import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { codexAllowanceFromRateLimits } from "#src/harness-allowance/codex-allowance";

const CodexRateLimitsPayload = {
    rateLimits: {
        limitId: "codex",
        limitName: null,
        primary: { usedPercent: 100, windowDurationMins: 10_080, resetsAt: 1_786_283_453 },
        secondary: null,
        credits: { hasCredits: false, unlimited: false, balance: "0" },
        planType: "plus",
        rateLimitReachedType: "rate_limit_reached"
    }
} as const;

describe("codexAllowanceFromRateLimits", () => {
    it("reads the window length Codex states rather than assuming a weekly one", () => {
        const allowance = codexAllowanceFromRateLimits({
            rateLimits: {
                ...CodexRateLimitsPayload.rateLimits,
                primary: { usedPercent: 12, windowDurationMins: 300, resetsAt: 1_786_283_453 }
            }
        });

        expect(allowance.windows[0]?.durationMinutes).toBe(300);
    });

    it("turns the epoch seconds Codex answers with into an instant", () => {
        const allowance = codexAllowanceFromRateLimits(CodexRateLimitsPayload);

        expect(allowance).toMatchObject({ kind: HarnessKinds.CODEX, plan: "plus" });
        expect(allowance.windows[0]?.resetsAt).toBe("2026-08-09T13:50:53.000Z");
    });

    it("drops the window a plan does not carry instead of reporting it unused", () => {
        const allowance = codexAllowanceFromRateLimits(CodexRateLimitsPayload);

        expect(allowance.windows).toHaveLength(1);
        expect(allowance.windows[0]?.usedPercent).toBe(100);
    });

    it("reads both windows when the plan is metered on two", () => {
        const allowance = codexAllowanceFromRateLimits({
            rateLimits: {
                ...CodexRateLimitsPayload.rateLimits,
                secondary: { usedPercent: 4, windowDurationMins: 300, resetsAt: null }
            }
        });

        expect(allowance.windows.map((window) => window.usedPercent)).toEqual([100, 4]);
        expect(allowance.windows[1]?.resetsAt).toBeNull();
    });
});
