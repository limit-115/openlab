import { HarnessKinds } from "@openlab/harness/agent-harness.const";
import type { HarnessAllowanceReading } from "@openlab/harness/harness-allowance.types";
import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { SpendCapKinds } from "@openlab/protocol/spend-caps/spend-cap.const";
import { SpendCapsSchema } from "@openlab/protocol/spend-caps/spend-cap.schema";
import { describe, expect, it } from "vitest";
import { HarnessAllowanceReadings } from "#src/harness-allowance/harness-allowance-readings";
import { harnessBlock } from "#src/harness-allowance/harness-block";
import { HarnessBlockKind } from "#src/harness-allowance/harness-block.const";

const WEEKLY_MINUTES = 10_080;
const RESETS_AT = "2026-08-09T13:50:53.000Z";

const CAPS = SpendCapsSchema.parse([
    {
        kind: SpendCapKinds.WINDOW_PERCENT,
        harness: AgentHarnessKind.CLAUDE,
        window_minutes: WEEKLY_MINUTES,
        max_used_percent: 60
    },
    {
        kind: SpendCapKinds.WALLET_FLOOR,
        harness: AgentHarnessKind.DEEPSEEK,
        currency: "USD",
        minimum_balance: "5.00"
    }
]);

function readings(usedPercent: number, resetsAt: string | null = RESETS_AT) {
    return new HarnessAllowanceReadings({
        read: async (kind): Promise<HarnessAllowanceReading> => ({
            kind,
            plan: "max",
            balances: [],
            spent: false,
            windows: [{ durationMinutes: WEEKLY_MINUTES, usedPercent, resetsAt }]
        })
    });
}

function walletReadings(amount: string, currency = "USD") {
    return new HarnessAllowanceReadings({
        read: async (kind): Promise<HarnessAllowanceReading> => ({
            kind,
            plan: null,
            balances: [{ currency, amount }],
            spent: false,
            windows: []
        })
    });
}

function spentWalletReadings() {
    return new HarnessAllowanceReadings({
        read: async (kind): Promise<HarnessAllowanceReading> => ({
            kind,
            plan: null,
            balances: [{ currency: "USD", amount: "0.00" }],
            spent: true,
            windows: []
        })
    });
}

describe("harnessBlock", () => {
    it("says how far past the cap the harness is and when it is worth asking again", async () => {
        const block = await harnessBlock({
            readings: readings(74),
            caps: CAPS,
            kind: HarnessKinds.CLAUDE,
            spendPastCaps: false
        });

        expect(block).toMatchObject({
            kind: HarnessBlockKind.WITHHELD,
            reason: `The max plan is 74% into a window capped at 60%, and is held until ${RESETS_AT}`,
            returnsAt: RESETS_AT
        });
        expect(block?.capabilityError).toBeUndefined();
    });

    it("holds a harness the vendor states no reset for, without promising it back", async () => {
        const block = await harnessBlock({
            readings: readings(74, null),
            caps: CAPS,
            kind: HarnessKinds.CLAUDE,
            spendPastCaps: false
        });

        expect(block?.reason).toBe("The max plan is 74% into a window capped at 60%");
        expect(block?.returnsAt).toBeUndefined();
    });

    it("asks the operator about a harness its vendor has stopped serving", async () => {
        const block = await harnessBlock({
            readings: readings(100),
            caps: CAPS,
            kind: HarnessKinds.CLAUDE,
            spendPastCaps: false
        });

        expect(block).toMatchObject({
            kind: HarnessBlockKind.EXHAUSTED,
            reason: `The max plan has no allowance left until ${RESETS_AT}`
        });
        expect(block?.capabilityError?.capabilityRequest.reason).toContain("no allowance left");
    });

    /**
     * The wallet the preflight would refuse the run on anyway, stopped a step earlier and for the
     * reason the vendor gave. Told to wait for a plan it never bought, an operator would sit out a
     * renewal that only their own payment brings back.
     */
    it("stops a spent wallet without calling it a plan that will renew", async () => {
        const block = await harnessBlock({
            readings: spentWalletReadings(),
            caps: CAPS,
            kind: HarnessKinds.DEEPSEEK,
            spendPastCaps: false
        });

        expect(block).toMatchObject({
            kind: HarnessBlockKind.EXHAUSTED,
            reason: "The deepseek account has no allowance left"
        });
        expect(block?.returnsAt).toBeUndefined();
    });

    it("lets a harness under its cap through", async () => {
        await expect(
            harnessBlock({
                readings: readings(59),
                caps: CAPS,
                kind: HarnessKinds.CLAUDE,
                spendPastCaps: false
            })
        ).resolves.toBeUndefined();
    });

    it("dispatches blind rather than guessing when no readings were wired in", async () => {
        await expect(
            harnessBlock({ caps: CAPS, kind: HarnessKinds.CLAUDE, spendPastCaps: false })
        ).resolves.toBeUndefined();
    });

    it("holds a wallet that fell to its floor, naming the money left and the money asked for", async () => {
        const block = await harnessBlock({
            readings: walletReadings("4.50"),
            caps: CAPS,
            kind: HarnessKinds.DEEPSEEK,
            spendPastCaps: false
        });

        expect(block).toMatchObject({
            kind: HarnessBlockKind.WITHHELD,
            reason: "The deepseek wallet is down to 4.50 USD, at or under the 5.00 USD it was floored at"
        });
        expect(block?.capabilityError).toBeUndefined();
    });

    /** A wallet fills only when the operator pays into it, so there is no hour to promise it back. */
    it("promises no return on a held wallet, because no vendor states one", async () => {
        const block = await harnessBlock({
            readings: walletReadings("4.50"),
            caps: CAPS,
            kind: HarnessKinds.DEEPSEEK,
            spendPastCaps: false
        });

        expect(block?.returnsAt).toBeUndefined();
    });

    it("lets a wallet still above its floor through", async () => {
        await expect(
            harnessBlock({
                readings: walletReadings("5.01"),
                caps: CAPS,
                kind: HarnessKinds.DEEPSEEK,
                spendPastCaps: false
            })
        ).resolves.toBeUndefined();
    });

    it("leaves a wallet paying in a currency nobody floored alone", async () => {
        await expect(
            harnessBlock({
                readings: walletReadings("0.01", "CNY"),
                caps: CAPS,
                kind: HarnessKinds.DEEPSEEK,
                spendPastCaps: false
            })
        ).resolves.toBeUndefined();
    });

    /** The investigation was dispatched to spend past the operator's own lines, wallet included. */
    it("spends a wallet past its floor where the investigation was told to", async () => {
        await expect(
            harnessBlock({
                readings: walletReadings("0.00"),
                caps: CAPS,
                kind: HarnessKinds.DEEPSEEK,
                spendPastCaps: true
            })
        ).resolves.toBeUndefined();
    });
});
