import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { windowSpendCap } from "@openlab/protocol/spend-caps/spend-cap";
import { describe, expect, it } from "vitest";
import { hasCapEdits, withWindowCap } from "#src/allowance-panel/spend-cap-draft";

const FIVE_HOURS = 300;
const SEVEN_DAYS = 10_080;

const CAPS = [
    { harness: AgentHarnessKind.CLAUDE, window_minutes: FIVE_HOURS, max_used_percent: 80 }
];

describe("withWindowCap", () => {
    it("caps one window without touching the others", () => {
        const capped = withWindowCap(CAPS, AgentHarnessKind.CLAUDE, SEVEN_DAYS, 60);

        expect(windowSpendCap(capped, AgentHarnessKind.CLAUDE, FIVE_HOURS)).toBe(80);
        expect(windowSpendCap(capped, AgentHarnessKind.CLAUDE, SEVEN_DAYS)).toBe(60);
    });

    it("replaces the cap on a window rather than capping it twice", () => {
        const capped = withWindowCap(CAPS, AgentHarnessKind.CLAUDE, FIVE_HOURS, 40);

        expect(capped).toHaveLength(1);
        expect(windowSpendCap(capped, AgentHarnessKind.CLAUDE, FIVE_HOURS)).toBe(40);
    });

    it("forgets a window handed back to the vendor's own ceiling", () => {
        expect(withWindowCap(CAPS, AgentHarnessKind.CLAUDE, FIVE_HOURS, 100)).toEqual([]);
    });
});

describe("hasCapEdits", () => {
    it("holds nothing the lab has not been given while the caps match", () => {
        expect(hasCapEdits([...CAPS].reverse(), CAPS)).toBe(false);
    });

    it("sees a cap that moved, one that was added and one that was handed back", () => {
        expect(
            hasCapEdits(withWindowCap(CAPS, AgentHarnessKind.CLAUDE, FIVE_HOURS, 40), CAPS)
        ).toBe(true);
        expect(hasCapEdits(withWindowCap(CAPS, AgentHarnessKind.CODEX, FIVE_HOURS, 40), CAPS)).toBe(
            true
        );
        expect(hasCapEdits([], CAPS)).toBe(true);
    });
});
