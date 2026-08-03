import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { HarnessTimeoutMilliseconds } from "#src/agent-harness/agent-harness.const";
import { ZAI_CODING_PLAN_QUOTA_URL, ZCodeLoginStore } from "#src/glm-cli/glm-cli.const";
import type { ZaiCodingPlan } from "#src/glm-cli/zai-coding-plan.types";

const ZCodeLoginStoreSchema = z.looseObject({
    provider: z.record(z.string(), z.unknown())
});

const CodingPlanProviderSchema = z.looseObject({
    options: z.looseObject({ apiKey: z.string().trim().min(1) })
});

/**
 * A wallet-billed credential answers this endpoint without a plan tier, so the tier itself is the
 * proof that the run draws on the subscription.
 */
const CodingPlanQuotaSchema = z.looseObject({
    data: z.looseObject({
        level: z.string().trim().min(1),
        limits: z.array(z.unknown()).min(1)
    })
});

/**
 * Reads the credential the ZCode desktop sign-in left behind and confirms it still carries a coding
 * plan. Nothing here accepts a key from the operator: the lab only ever reads a local login.
 */
export async function resolveZaiCodingPlan(): Promise<ZaiCodingPlan> {
    const apiKey = await readCodingPlanKey();
    return { apiKey, level: await readCodingPlanLevel(apiKey) };
}

export async function readCodingPlanKey(): Promise<string> {
    const path = join(homedir(), ...ZCodeLoginStore.CONFIG_SEGMENTS);
    let store: unknown;
    try {
        store = JSON.parse(await readFile(path, "utf8"));
    } catch (error) {
        throw new Error(`No ZCode login store at ${path}`, { cause: error });
    }

    const providers = ZCodeLoginStoreSchema.parse(store).provider;
    const provider = providers[ZCodeLoginStore.CODING_PLAN_PROVIDER];
    if (provider === undefined) {
        throw new Error(`${path} has no ${ZCodeLoginStore.CODING_PLAN_PROVIDER} provider`);
    }

    return CodingPlanProviderSchema.parse(provider).options.apiKey;
}

async function readCodingPlanLevel(apiKey: string): Promise<string> {
    const response = await fetch(ZAI_CODING_PLAN_QUOTA_URL, {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(HarnessTimeoutMilliseconds.PREFLIGHT)
    });
    if (!response.ok) {
        throw new Error(
            `Z.ai reported no coding plan for this credential (HTTP ${response.status})`
        );
    }

    return CodingPlanQuotaSchema.parse(await response.json()).data.level;
}
