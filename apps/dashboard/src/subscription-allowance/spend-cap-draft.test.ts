import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { walletSpendFloor, windowSpendCap } from "@openlab/protocol/spend-caps/spend-cap";
import { SpendCapKinds } from "@openlab/protocol/spend-caps/spend-cap.const";
import { SpendCapsSchema } from "@openlab/protocol/spend-caps/spend-cap.schema";
import type { SpendCaps } from "@openlab/protocol/spend-caps/spend-cap.types";
import { describe, expect, it } from "vitest";
import {
    hasCapEdits,
    settledCaps,
    withWalletFloor,
    withWindowCap
} from "#src/subscription-allowance/spend-cap-draft";

const FIVE_HOURS = 300;
const SEVEN_DAYS = 10_080;

const CAPS: SpendCaps = [
    {
        kind: SpendCapKinds.WINDOW_PERCENT,
        harness: AgentHarnessKind.CLAUDE,
        window_minutes: FIVE_HOURS,
        max_used_percent: 80
    }
];

const FLOORS: SpendCaps = [
    {
        kind: SpendCapKinds.WALLET_FLOOR,
        harness: AgentHarnessKind.DEEPSEEK,
        currency: "USD",
        minimum_balance: "5.00"
    }
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

    it("leaves a wallet floor alone while a window on the same harness moves", () => {
        const capped = withWindowCap(FLOORS, AgentHarnessKind.DEEPSEEK, FIVE_HOURS, 40);

        expect(walletSpendFloor(capped, AgentHarnessKind.DEEPSEEK, "USD")).toBe("5.00");
    });
});

describe("withWalletFloor", () => {
    it("floors one currency without touching the others", () => {
        const floored = withWalletFloor(FLOORS, AgentHarnessKind.DEEPSEEK, "CNY", "30");

        expect(walletSpendFloor(floored, AgentHarnessKind.DEEPSEEK, "USD")).toBe("5.00");
        expect(walletSpendFloor(floored, AgentHarnessKind.DEEPSEEK, "CNY")).toBe("30");
    });

    it("replaces the floor under a currency rather than flooring it twice", () => {
        const floored = withWalletFloor(FLOORS, AgentHarnessKind.DEEPSEEK, "USD", "9.99");

        expect(floored).toHaveLength(1);
        expect(walletSpendFloor(floored, AgentHarnessKind.DEEPSEEK, "USD")).toBe("9.99");
    });

    it("forgets a floor the operator emptied, which is how the wallet is handed back", () => {
        expect(withWalletFloor(FLOORS, AgentHarnessKind.DEEPSEEK, "USD", "  ")).toEqual([]);
    });

    /** Nought is a number they typed; empty is the absence of one, and only one of them is a floor. */
    it("keeps a floor of nought, which is not the same as no floor at all", () => {
        const floored = withWalletFloor(FLOORS, AgentHarnessKind.DEEPSEEK, "USD", "0");

        expect(walletSpendFloor(floored, AgentHarnessKind.DEEPSEEK, "USD")).toBe("0");
    });

    it("leaves a window cap alone while a wallet on the same harness moves", () => {
        const floored = withWalletFloor(CAPS, AgentHarnessKind.CLAUDE, "USD", "5");

        expect(windowSpendCap(floored, AgentHarnessKind.CLAUDE, FIVE_HOURS)).toBe(80);
    });
});

describe("settledCaps", () => {
    function floored(typed: string): SpendCaps {
        return settledCaps(withWalletFloor([], AgentHarnessKind.DEEPSEEK, "USD", typed));
    }

    /**
     * The protocol is the judge here rather than a string comparison: the point of settling is that
     * what the operator half typed is money the lab will actually take.
     */
    it.each(["5.", ".5", "0.", ".05", "5.00"])(
        "hands the lab money it takes from a floor typed as %s",
        (typed) => {
            expect(() => SpendCapsSchema.parse(floored(typed))).not.toThrow();
        }
    );

    it("reads a floor typed as .5 as nought point five rather than as five", () => {
        expect(walletSpendFloor(floored(".5"), AgentHarnessKind.DEEPSEEK, "USD")).toBe("0.5");
    });

    it("reads a floor left at 5. as five, cents and all still to come", () => {
        expect(walletSpendFloor(floored("5."), AgentHarnessKind.DEEPSEEK, "USD")).toBe("5");
    });

    it("lifts a floor that got no further than a point, which names no figure at all", () => {
        expect(floored(".")).toEqual([]);
    });

    it("leaves a window cap as it stands, having no half-typed form to settle", () => {
        expect(settledCaps(CAPS)).toEqual(CAPS);
    });
});

describe("hasCapEdits", () => {
    it("holds nothing the lab has not been given while the caps match", () => {
        const held = [...CAPS, ...FLOORS];

        expect(hasCapEdits([...held].reverse(), held)).toBe(false);
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

    it("sees a floor that moved, one that was added and one that was lifted", () => {
        expect(
            hasCapEdits(withWalletFloor(FLOORS, AgentHarnessKind.DEEPSEEK, "USD", "9"), FLOORS)
        ).toBe(true);
        expect(
            hasCapEdits(withWalletFloor(FLOORS, AgentHarnessKind.DEEPSEEK, "CNY", "9"), FLOORS)
        ).toBe(true);
        expect(hasCapEdits([], FLOORS)).toBe(true);
    });
});
