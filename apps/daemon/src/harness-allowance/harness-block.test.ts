import { HarnessKinds } from "@openlab/harness/agent-harness.const";
import type { HarnessAllowanceReading } from "@openlab/harness/harness-allowance.types";
import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { SpendCapsSchema } from "@openlab/protocol/spend-caps/spend-cap.schema";
import { describe, expect, it } from "vitest";
import { HarnessAllowanceReadings } from "#src/harness-allowance/harness-allowance-readings";
import { harnessBlock } from "#src/harness-allowance/harness-block";
import { HarnessBlockKind } from "#src/harness-allowance/harness-block.const";

const WEEKLY_MINUTES = 10_080;
const RESETS_AT = "2026-08-09T13:50:53.000Z";

const CAPS = SpendCapsSchema.parse([
    { harness: AgentHarnessKind.CLAUDE, window_minutes: WEEKLY_MINUTES, max_used_percent: 60 }
]);

function readings(usedPercent: number, resetsAt: string | null = RESETS_AT) {
    return new HarnessAllowanceReadings({
        read: async (kind): Promise<HarnessAllowanceReading> => ({
            kind,
            plan: "max",
            balance: null,
            windows: [{ durationMinutes: WEEKLY_MINUTES, usedPercent, resetsAt }]
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
});
