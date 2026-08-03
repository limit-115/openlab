import { describe, expect, it } from "vitest";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { glmAllowanceFromQuota } from "#src/subscription-allowance/glm-allowance";
import { ZaiSpendingLimitType } from "#src/subscription-allowance/subscription-allowance.const";

const ZaiQuotaPayload = {
    code: 200,
    msg: "Operation successful",
    data: {
        limits: [
            {
                type: ZaiSpendingLimitType.CREDIT,
                unit: 3,
                number: 5,
                usage: 12_000,
                currentValue: 9251,
                remaining: 2748,
                percentage: 77,
                nextResetTime: 1_785_782_059_358
            },
            {
                type: ZaiSpendingLimitType.CREDIT,
                unit: 6,
                number: 1,
                usage: 60_000,
                currentValue: 23_816,
                remaining: 36_183,
                percentage: 39,
                nextResetTime: 1_786_228_011_998
            }
        ],
        level: "pro"
    },
    success: true
} as const;

describe("glmAllowanceFromQuota", () => {
    it("multiplies the period unit by the count Z.ai states to get each window length", () => {
        const allowance = glmAllowanceFromQuota(ZaiQuotaPayload);

        expect(allowance).toMatchObject({ kind: HarnessKinds.GLM, plan: "pro" });
        expect(allowance.windows.map((window) => window.durationMinutes)).toEqual([300, 10_080]);
    });

    it("turns the epoch milliseconds Z.ai answers with into an instant", () => {
        const allowance = glmAllowanceFromQuota(ZaiQuotaPayload);

        expect(allowance.windows[0]?.resetsAt).toBe("2026-08-03T18:34:19.358Z");
    });

    it("leaves out the MCP time limit, which no run spends and would park a plan with tokens left", () => {
        const allowance = glmAllowanceFromQuota({
            ...ZaiQuotaPayload,
            data: {
                ...ZaiQuotaPayload.data,
                limits: [
                    ...ZaiQuotaPayload.data.limits,
                    {
                        type: "TIME_LIMIT",
                        unit: 5,
                        number: 1,
                        usage: 100,
                        currentValue: 100,
                        remaining: 0,
                        percentage: 100,
                        nextResetTime: 1_786_228_011_998
                    }
                ]
            }
        });

        expect(allowance.windows.map((window) => window.usedPercent)).toEqual([77, 39]);
    });

    it("drops a period unit it cannot name instead of guessing its length", () => {
        const allowance = glmAllowanceFromQuota({
            ...ZaiQuotaPayload,
            data: {
                ...ZaiQuotaPayload.data,
                limits: [{ ...ZaiQuotaPayload.data.limits[0], unit: 99 }]
            }
        });

        expect(allowance.windows).toHaveLength(0);
        expect(allowance.plan).toBe("pro");
    });

    it("spans one period when the plan states no count", () => {
        const allowance = glmAllowanceFromQuota({
            ...ZaiQuotaPayload,
            data: {
                ...ZaiQuotaPayload.data,
                limits: [{ type: ZaiSpendingLimitType.TOKENS, unit: 6, percentage: 4 }]
            }
        });

        expect(allowance.windows[0]?.durationMinutes).toBe(10_080);
    });
});
