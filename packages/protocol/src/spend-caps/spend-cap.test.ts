import { describe, expect, it } from "vitest";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { HarnessAllowanceState } from "#src/harness-allowance/harness-allowance.const";
import type {
    AllowanceBalance,
    AllowanceWindow,
    HarnessAllowance
} from "#src/harness-allowance/harness-allowance.types";
import {
    isSpendCapLoosened,
    walletSpendFloor,
    windowSpendCap,
    withheldBalances,
    withheldWindows
} from "#src/spend-caps/spend-cap";
import { SpendCapKinds } from "#src/spend-caps/spend-cap.const";
import { SpendCapsSchema } from "#src/spend-caps/spend-cap.schema";

const FIVE_HOURS = 300;
const SEVEN_DAYS = 10_080;

const CAPS = SpendCapsSchema.parse([
    {
        kind: SpendCapKinds.WINDOW_PERCENT,
        harness: AgentHarnessKind.CLAUDE,
        window_minutes: FIVE_HOURS,
        max_used_percent: 80
    },
    {
        kind: SpendCapKinds.WINDOW_PERCENT,
        harness: AgentHarnessKind.CLAUDE,
        window_minutes: SEVEN_DAYS,
        max_used_percent: 60
    }
]);

const FLOORS = SpendCapsSchema.parse([
    {
        kind: SpendCapKinds.WALLET_FLOOR,
        harness: AgentHarnessKind.DEEPSEEK,
        currency: "USD",
        minimum_balance: "5.00"
    }
]);

function claudeAllowance(windows: readonly AllowanceWindow[]): HarnessAllowance {
    return {
        harness: AgentHarnessKind.CLAUDE,
        state: HarnessAllowanceState.AVAILABLE,
        plan: "max",
        windows: [...windows],
        balances: [],
        error: null,
        read_at: "2026-08-05T09:00:00.000Z"
    };
}

function deepseekWallet(balances: readonly AllowanceBalance[]): HarnessAllowance {
    return {
        harness: AgentHarnessKind.DEEPSEEK,
        state: HarnessAllowanceState.AVAILABLE,
        plan: null,
        windows: [],
        balances: [...balances],
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

    it("reads past a wallet floor set on the same harness, which caps no window", () => {
        const mixed = SpendCapsSchema.parse([
            ...CAPS,
            {
                kind: SpendCapKinds.WALLET_FLOOR,
                harness: AgentHarnessKind.CLAUDE,
                currency: "USD",
                minimum_balance: "40"
            }
        ]);

        expect(windowSpendCap(mixed, AgentHarnessKind.CLAUDE, FIVE_HOURS)).toBe(80);
    });
});

describe("walletSpendFloor", () => {
    it("answers with nothing for a currency the operator floored nowhere", () => {
        expect(walletSpendFloor(FLOORS, AgentHarnessKind.DEEPSEEK, "CNY")).toBeUndefined();
        expect(walletSpendFloor(FLOORS, AgentHarnessKind.MUSE, "USD")).toBeUndefined();
    });

    it("keeps the floor as the operator wrote it rather than as a rounded number", () => {
        expect(walletSpendFloor(FLOORS, AgentHarnessKind.DEEPSEEK, "USD")).toBe("5.00");
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
        const unreadable: HarnessAllowance = {
            harness: AgentHarnessKind.CLAUDE,
            state: HarnessAllowanceState.UNREADABLE,
            plan: null,
            windows: [],
            balances: [],
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

describe("withheldBalances", () => {
    it("withholds a wallet that has fallen under the floor the operator set", () => {
        const withheld = withheldBalances(
            deepseekWallet([{ currency: "USD", amount: "4.99" }]),
            FLOORS
        );

        expect(withheld.map(({ amount }) => amount)).toEqual(["4.99"]);
    });

    it("withholds on the floor exactly, which is the money the operator asked to keep", () => {
        expect(
            withheldBalances(deepseekWallet([{ currency: "USD", amount: "5.00" }]), FLOORS)
        ).toHaveLength(1);
    });

    it("compares the balance as decimal money rather than by how the number reads", () => {
        expect(
            withheldBalances(deepseekWallet([{ currency: "USD", amount: "40.00" }]), FLOORS)
        ).toEqual([]);
        expect(
            withheldBalances(deepseekWallet([{ currency: "USD", amount: "5.000000001" }]), FLOORS)
        ).toEqual([]);
    });

    it("holds nothing back on a currency the operator floored nowhere", () => {
        expect(
            withheldBalances(deepseekWallet([{ currency: "CNY", amount: "0.01" }]), FLOORS)
        ).toEqual([]);
    });

    it("withholds the wallet on one currency while another still pays, because the floor was on that money", () => {
        const withheld = withheldBalances(
            deepseekWallet([
                { currency: "USD", amount: "1.00" },
                { currency: "CNY", amount: "900.00" }
            ]),
            FLOORS
        );

        expect(withheld.map(({ currency }) => currency)).toEqual(["USD"]);
    });

    it("withholds nothing on a floor whose currency the wallet has stopped reporting", () => {
        expect(
            withheldBalances(deepseekWallet([{ currency: "CNY", amount: "0" }]), FLOORS)
        ).toEqual([]);
    });

    it("reads a floor against the wallet it was set on and no other", () => {
        const muse = {
            ...deepseekWallet([{ currency: "USD", amount: "0" }]),
            harness: AgentHarnessKind.MUSE
        };

        expect(withheldBalances(muse, FLOORS)).toEqual([]);
    });
});

describe("isSpendCapLoosened", () => {
    const raised = SpendCapsSchema.parse([
        {
            kind: SpendCapKinds.WINDOW_PERCENT,
            harness: AgentHarnessKind.CLAUDE,
            window_minutes: FIVE_HOURS,
            max_used_percent: 95
        },
        {
            kind: SpendCapKinds.WINDOW_PERCENT,
            harness: AgentHarnessKind.CLAUDE,
            window_minutes: SEVEN_DAYS,
            max_used_percent: 60
        }
    ]);
    const lowered = SpendCapsSchema.parse([
        {
            kind: SpendCapKinds.WALLET_FLOOR,
            harness: AgentHarnessKind.DEEPSEEK,
            currency: "USD",
            minimum_balance: "1.00"
        }
    ]);

    it("sees a cap raised, and one handed back to the vendor's own ceiling", () => {
        expect(isSpendCapLoosened(CAPS, raised)).toBe(true);
        expect(isSpendCapLoosened(CAPS, [])).toBe(true);
    });

    it("leaves a tightened or unchanged cap alone, which frees nothing that was held", () => {
        expect(isSpendCapLoosened(raised, CAPS)).toBe(false);
        expect(isSpendCapLoosened(CAPS, CAPS)).toBe(false);
        expect(isSpendCapLoosened([], [])).toBe(false);
    });

    it("reads a newly capped window as tighter, however far off the cap stands", () => {
        expect(isSpendCapLoosened([], CAPS)).toBe(false);
    });

    it("sees a wallet floor lowered, and one lifted off the wallet altogether", () => {
        expect(isSpendCapLoosened(FLOORS, lowered)).toBe(true);
        expect(isSpendCapLoosened(FLOORS, [])).toBe(true);
    });

    it("leaves a raised or unchanged wallet floor alone, which frees no wallet", () => {
        expect(isSpendCapLoosened(lowered, FLOORS)).toBe(false);
        expect(isSpendCapLoosened(FLOORS, FLOORS)).toBe(false);
        expect(isSpendCapLoosened([], FLOORS)).toBe(false);
    });

    it("sees a wallet freed while a window cap alongside it was tightened", () => {
        const held = SpendCapsSchema.parse([...CAPS, ...FLOORS]);
        const swapped = SpendCapsSchema.parse([
            {
                kind: SpendCapKinds.WINDOW_PERCENT,
                harness: AgentHarnessKind.CLAUDE,
                window_minutes: FIVE_HOURS,
                max_used_percent: 10
            },
            {
                kind: SpendCapKinds.WINDOW_PERCENT,
                harness: AgentHarnessKind.CLAUDE,
                window_minutes: SEVEN_DAYS,
                max_used_percent: 10
            },
            ...lowered
        ]);

        expect(isSpendCapLoosened(held, swapped)).toBe(true);
    });
});

describe("SpendCapsSchema", () => {
    it("refuses one window capped twice, which names no ceiling", () => {
        expect(() =>
            SpendCapsSchema.parse([
                {
                    kind: SpendCapKinds.WINDOW_PERCENT,
                    harness: AgentHarnessKind.CLAUDE,
                    window_minutes: FIVE_HOURS,
                    max_used_percent: 80
                },
                {
                    kind: SpendCapKinds.WINDOW_PERCENT,
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
                    kind: SpendCapKinds.WINDOW_PERCENT,
                    harness: AgentHarnessKind.CLAUDE,
                    window_minutes: FIVE_HOURS,
                    max_used_percent: 80
                },
                {
                    kind: SpendCapKinds.WINDOW_PERCENT,
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
                    kind: SpendCapKinds.WINDOW_PERCENT,
                    harness: AgentHarnessKind.CLAUDE,
                    window_minutes: FIVE_HOURS,
                    max_used_percent: 120
                }
            ])
        ).toThrow();
    });

    it("refuses one wallet currency floored twice, which names no floor", () => {
        expect(() =>
            SpendCapsSchema.parse([
                {
                    kind: SpendCapKinds.WALLET_FLOOR,
                    harness: AgentHarnessKind.DEEPSEEK,
                    currency: "USD",
                    minimum_balance: "5"
                },
                {
                    kind: SpendCapKinds.WALLET_FLOOR,
                    harness: AgentHarnessKind.DEEPSEEK,
                    currency: "USD",
                    minimum_balance: "9"
                }
            ])
        ).toThrow();
    });

    it("takes one wallet floored in each currency it pays in", () => {
        expect(
            SpendCapsSchema.parse([
                {
                    kind: SpendCapKinds.WALLET_FLOOR,
                    harness: AgentHarnessKind.DEEPSEEK,
                    currency: "USD",
                    minimum_balance: "5"
                },
                {
                    kind: SpendCapKinds.WALLET_FLOOR,
                    harness: AgentHarnessKind.DEEPSEEK,
                    currency: "CNY",
                    minimum_balance: "30"
                }
            ])
        ).toHaveLength(2);
    });

    /**
     * A lab that was already capped stays capped across the change that gave caps kinds. Dropping the
     * entry would leave the operator's own instruction gone and the vendor's whole ceiling in force,
     * with nothing on screen to say it had happened.
     */
    it("reads a cap stored before caps had kinds as the window cap it was", () => {
        const stored = SpendCapsSchema.parse([
            { harness: AgentHarnessKind.CLAUDE, window_minutes: SEVEN_DAYS, max_used_percent: 80 }
        ]);

        expect(windowSpendCap(stored, AgentHarnessKind.CLAUDE, SEVEN_DAYS)).toBe(80);
    });

    it("refuses a floor that is not money, which nothing could be compared against", () => {
        expect(() =>
            SpendCapsSchema.parse([
                {
                    kind: SpendCapKinds.WALLET_FLOOR,
                    harness: AgentHarnessKind.DEEPSEEK,
                    currency: "USD",
                    minimum_balance: "5 dollars"
                }
            ])
        ).toThrow();
    });
});
