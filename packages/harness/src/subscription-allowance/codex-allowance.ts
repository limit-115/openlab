import { z } from "zod";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { allowanceInstant } from "#src/subscription-allowance/allowance-instant";
import { requestCodexAppServer } from "#src/subscription-allowance/codex-app-server";
import { CodexAppServer } from "#src/subscription-allowance/subscription-allowance.const";
import type {
    AllowanceWindow,
    SubscriptionAllowance
} from "#src/subscription-allowance/subscription-allowance.types";

/** Codex is the one vendor that states how long a window runs, so nothing has to be assumed. */
const CodexWindowSchema = z.looseObject({
    usedPercent: z.number().nonnegative(),
    windowDurationMins: z.number().int().positive(),
    resetsAt: z.number().int().nonnegative().nullish()
});

const CodexRateLimitsSchema = z.looseObject({
    rateLimits: z.looseObject({
        planType: z.string().trim().min(1).nullish(),
        primary: CodexWindowSchema.nullish(),
        secondary: CodexWindowSchema.nullish()
    })
});

export function codexAllowanceFromRateLimits(payload: unknown): SubscriptionAllowance {
    const limits = CodexRateLimitsSchema.parse(payload).rateLimits;
    return {
        kind: HarnessKinds.CODEX,
        plan: limits.planType ?? null,
        windows: [limits.primary, limits.secondary]
            .filter((window) => window !== null && window !== undefined)
            .map(codexWindow)
    };
}

export async function readCodexAllowance(signal?: AbortSignal): Promise<SubscriptionAllowance> {
    return codexAllowanceFromRateLimits(
        await requestCodexAppServer(CodexAppServer.RATE_LIMITS, signal)
    );
}

function codexWindow(window: z.infer<typeof CodexWindowSchema>): AllowanceWindow {
    return {
        durationMinutes: window.windowDurationMins,
        usedPercent: window.usedPercent,
        resetsAt: allowanceInstant(
            window.resetsAt === null || window.resetsAt === undefined
                ? null
                : new Date(window.resetsAt * 1000)
        )
    };
}
