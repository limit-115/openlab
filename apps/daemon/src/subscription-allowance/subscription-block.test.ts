import { HarnessKinds } from "@nightlab/harness/agent-harness.const";
import type { SubscriptionAllowance as HarnessAllowance } from "@nightlab/harness/subscription-allowance.types";
import { AgentHarnessKind } from "@nightlab/protocol/agents/agent-execution.const";
import { SpendCapsSchema } from "@nightlab/protocol/spend-caps/spend-cap.schema";
import { describe, expect, it } from "vitest";
import { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";
import { subscriptionBlock } from "#src/subscription-allowance/subscription-block";
import { SubscriptionBlockKind } from "#src/subscription-allowance/subscription-block.const";

const WEEKLY_MINUTES = 10_080;
const RESETS_AT = "2026-08-09T13:50:53.000Z";

const CAPS = SpendCapsSchema.parse([
    { harness: AgentHarnessKind.CLAUDE, window_minutes: WEEKLY_MINUTES, max_used_percent: 60 }
]);

function readings(usedPercent: number, resetsAt: string | null = RESETS_AT) {
    return new SubscriptionAllowanceReadings({
        read: async (kind): Promise<HarnessAllowance> => ({
            kind,
            plan: "max",
            windows: [{ durationMinutes: WEEKLY_MINUTES, usedPercent, resetsAt }]
        })
    });
}

describe("subscriptionBlock", () => {
    it("says how far past the cap the subscription is and when it is worth asking again", async () => {
        const block = await subscriptionBlock({
            readings: readings(74),
            caps: CAPS,
            kind: HarnessKinds.CLAUDE,
            spendPastCaps: false
        });

        expect(block).toMatchObject({
            kind: SubscriptionBlockKind.WITHHELD,
            reason: `The max plan is 74% into a window capped at 60%, and is held until ${RESETS_AT}`,
            returnsAt: RESETS_AT
        });
        expect(block?.capabilityError).toBeUndefined();
    });

    it("holds a subscription the vendor states no reset for, without promising it back", async () => {
        const block = await subscriptionBlock({
            readings: readings(74, null),
            caps: CAPS,
            kind: HarnessKinds.CLAUDE,
            spendPastCaps: false
        });

        expect(block?.reason).toBe("The max plan is 74% into a window capped at 60%");
        expect(block?.returnsAt).toBeUndefined();
    });

    it("asks the operator about a subscription its vendor has stopped serving", async () => {
        const block = await subscriptionBlock({
            readings: readings(100),
            caps: CAPS,
            kind: HarnessKinds.CLAUDE,
            spendPastCaps: false
        });

        expect(block).toMatchObject({
            kind: SubscriptionBlockKind.EXHAUSTED,
            reason: `The max plan has no allowance left until ${RESETS_AT}`
        });
        expect(block?.capabilityError?.capabilityRequest.reason).toContain("no allowance left");
    });

    it("lets a subscription under its cap through", async () => {
        await expect(
            subscriptionBlock({
                readings: readings(59),
                caps: CAPS,
                kind: HarnessKinds.CLAUDE,
                spendPastCaps: false
            })
        ).resolves.toBeUndefined();
    });

    it("dispatches blind rather than guessing when no readings were wired in", async () => {
        await expect(
            subscriptionBlock({ caps: CAPS, kind: HarnessKinds.CLAUDE, spendPastCaps: false })
        ).resolves.toBeUndefined();
    });
});
