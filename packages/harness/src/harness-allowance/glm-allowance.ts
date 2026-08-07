import { z } from "zod";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { ZAI_CODING_PLAN_QUOTA_URL } from "#src/glm-cli/glm-cli.const";
import { readCodingPlanKey } from "#src/glm-cli/zai-coding-plan";
import { allowanceDeadline } from "#src/harness-allowance/allowance-deadline";
import { allowanceInstant } from "#src/harness-allowance/allowance-instant";
import {
    ZaiPeriodMinutes,
    ZaiSpendingLimitType
} from "#src/harness-allowance/harness-allowance.const";
import type {
    AllowanceWindow,
    HarnessAllowanceReading
} from "#src/harness-allowance/harness-allowance.types";

const ZaiLimitSchema = z.looseObject({
    type: z.string().trim().min(1),
    unit: z.number().int(),
    /** How many of the period the window spans; a plan that states only the unit spans one. */
    number: z.number().int().positive().nullish(),
    percentage: z.number().nonnegative(),
    nextResetTime: z.number().int().nonnegative().nullish()
});

const ZaiQuotaSchema = z.looseObject({
    data: z.looseObject({
        level: z.string().trim().min(1).nullish(),
        limits: z.array(ZaiLimitSchema)
    })
});

const SPENDING_LIMIT_TYPES: readonly string[] = Object.values(ZaiSpendingLimitType);

export function glmAllowanceFromQuota(payload: unknown): HarnessAllowanceReading {
    const quota = ZaiQuotaSchema.parse(payload).data;
    return {
        kind: HarnessKinds.GLM,
        plan: quota.level ?? null,
        balance: null,
        windows: quota.limits
            .filter((limit) => SPENDING_LIMIT_TYPES.includes(limit.type))
            .map(glmWindow)
            .filter((window): window is AllowanceWindow => window !== undefined)
    };
}

/**
 * Asks Z.ai what is left of the coding plan, reusing the credential the ZCode sign-in left behind.
 * The same endpoint already proves a run is subscription-billed; this reads the quota it states
 * alongside the tier.
 */
export async function readGlmAllowance(signal?: AbortSignal): Promise<HarnessAllowanceReading> {
    const apiKey = await readCodingPlanKey();
    const response = await fetch(ZAI_CODING_PLAN_QUOTA_URL, {
        headers: { Authorization: apiKey },
        signal: allowanceDeadline(signal)
    });
    if (!response.ok) {
        throw new Error(`Z.ai did not report coding plan quota (HTTP ${response.status})`);
    }

    return glmAllowanceFromQuota(await response.json());
}

function glmWindow(limit: z.infer<typeof ZaiLimitSchema>): AllowanceWindow | undefined {
    const periodMinutes = ZaiPeriodMinutes[limit.unit];
    if (periodMinutes === undefined) {
        return undefined;
    }

    return {
        durationMinutes: periodMinutes * (limit.number ?? 1),
        usedPercent: limit.percentage,
        resetsAt: allowanceInstant(
            limit.nextResetTime === null || limit.nextResetTime === undefined
                ? null
                : new Date(limit.nextResetTime)
        )
    };
}
