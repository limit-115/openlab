import { describe, expect, it } from "vitest";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { windowSpendCap, withheldWindows } from "#src/spend-caps/spend-cap";
import { SpendCapsSchema } from "#src/spend-caps/spend-cap.schema";
import { SubscriptionAllowanceState } from "#src/subscription-allowance/subscription-allowance.const";
import type {
    AllowanceWindow,
    SubscriptionAllowance
} from "#src/subscription-allowance/subscription-allowance.types";

const FIVE_HOURS = 300;
const SEVEN_DAYS = 10_080;

const CAPS = SpendCapsSchema.parse([
    { harness: AgentHarnessKind.CLAUDE, window_minutes: FIVE_HOURS, max_used_percent: 80 },
    { harness: AgentHarnessKind.CLAUDE, window_minutes: SEVEN_DAYS, max_used_percent: 60 }
]);

function claudeAllowance(windows: readonly AllowanceWindow[]): SubscriptionAllowance {
    return {
        harness: AgentHarnessKind.CLAUDE,
        state: SubscriptionAllowanceState.AVAILABLE,
        plan: "max",
        windows: [...windows],
        error: null,
        read_at: "2026-08-05T09:00:00.000Z"
    };
}

function window(durationMinutes: number, usedPercent: number): AllowanceWindow {
    return { duration_minutes: durationMinutes, used_percent: usedPercent, resets_at: null };
}

describe("windowSpendCap", () => {
    it("leaves a window nobody capped at the whole of what the vendor serves", () => {
        expect(windowSpendCap(CAPS, AgentHarnessKind.CODEX, FIVE_HOURS)).toBe(100);
        expect(windowSpendCap([], AgentHarnessKind.CLAUDE, FIVE_HOURS)).toBe(100);
    });

    it("keeps each window on the cap set for it rather than on the subscription's lowest", () => {
        expect(windowSpendCap(CAPS, AgentHarnessKind.CLAUDE, FIVE_HOURS)).toBe(80);
        expect(windowSpendCap(CAPS, AgentHarnessKind.CLAUDE, SEVEN_DAYS)).toBe(60);
    });
});

describe("withheldWindows", () => {
    it("withholds the whole subscription on the one window that reached its cap", () => {
        const withheld = withheldWindows(
            claudeAllowance([window(FIVE_HOURS, 12), window(SEVEN_DAYS, 61)]),
            CAPS
        );

        expect(withheld.map(({ duration_minutes }) => duration_minutes)).toEqual([SEVEN_DAYS]);
    });

    it("holds nothing back while every capped window is still under its cap", () => {
        expect(
            withheldWindows(claudeAllowance([window(FIVE_HOURS, 79), window(SEVEN_DAYS, 59)]), CAPS)
        ).toEqual([]);
    });

    it("withholds on the cap exactly, which is the point the operator asked the lab to stop at", () => {
        expect(withheldWindows(claudeAllowance([window(FIVE_HOURS, 80)]), CAPS)).toHaveLength(1);
    });

    it("leaves a spent window to the vendor, which is a different thing to act on", () => {
        expect(withheldWindows(claudeAllowance([window(FIVE_HOURS, 100)]), [])).toEqual([]);
    });

    it("withholds nothing when the vendor could not be read, so broken monitoring never parks the lab", () => {
        const unreadable: SubscriptionAllowance = {
            harness: AgentHarnessKind.CLAUDE,
            state: SubscriptionAllowanceState.UNREADABLE,
            plan: null,
            windows: [],
            error: "No Keychain entry",
            read_at: "2026-08-05T09:00:00.000Z"
        };

        expect(withheldWindows(unreadable, CAPS)).toEqual([]);
    });

    it("reads a cap against the subscription it was set on and no other", () => {
        const codex = {
            ...claudeAllowance([window(FIVE_HOURS, 90)]),
            harness: AgentHarnessKind.CODEX
        };

        expect(withheldWindows(codex, CAPS)).toEqual([]);
    });
});

describe("SpendCapsSchema", () => {
    it("refuses one window capped twice, which names no ceiling", () => {
        expect(() =>
            SpendCapsSchema.parse([
                {
                    harness: AgentHarnessKind.CLAUDE,
                    window_minutes: FIVE_HOURS,
                    max_used_percent: 80
                },
                {
                    harness: AgentHarnessKind.CLAUDE,
                    window_minutes: FIVE_HOURS,
                    max_used_percent: 40
                }
            ])
        ).toThrow();
    });

    it("takes the same window capped on two subscriptions, which are metered apart", () => {
        expect(
            SpendCapsSchema.parse([
                {
                    harness: AgentHarnessKind.CLAUDE,
                    window_minutes: FIVE_HOURS,
                    max_used_percent: 80
                },
                {
                    harness: AgentHarnessKind.CODEX,
                    window_minutes: FIVE_HOURS,
                    max_used_percent: 40
                }
            ])
        ).toHaveLength(2);
    });

    it("refuses a cap above what the vendor would ever serve", () => {
        expect(() =>
            SpendCapsSchema.parse([
                {
                    harness: AgentHarnessKind.CLAUDE,
                    window_minutes: FIVE_HOURS,
                    max_used_percent: 120
                }
            ])
        ).toThrow();
    });
});
