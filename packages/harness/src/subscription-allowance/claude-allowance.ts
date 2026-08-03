import { execa } from "execa";
import { z } from "zod";
import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { allowanceDeadline } from "#src/subscription-allowance/allowance-deadline";
import { allowanceInstant } from "#src/subscription-allowance/allowance-instant";
import {
    CLAUDE_OAUTH_BETA,
    CLAUDE_OAUTH_USAGE_URL,
    ClaudeCredentialStore,
    ClaudeWindowMinutes
} from "#src/subscription-allowance/subscription-allowance.const";
import type {
    AllowanceWindow,
    SubscriptionAllowance
} from "#src/subscription-allowance/subscription-allowance.types";

const KeychainCredentialsSchema = z.looseObject({
    claudeAiOauth: z.looseObject({
        accessToken: z.string().trim().min(1),
        subscriptionType: z.string().trim().min(1).nullish()
    })
});

const UsageWindowSchema = z.looseObject({
    utilization: z.number().nonnegative(),
    resets_at: z.string().trim().min(1).nullish()
});

/**
 * The endpoint also names windows that only some plans are metered on. Reading just the two every
 * subscription carries keeps an absent window out of the operator's meters instead of showing it
 * at nought.
 */
const OAuthUsageSchema = z.looseObject({
    five_hour: UsageWindowSchema.nullish(),
    seven_day: UsageWindowSchema.nullish()
});

interface ClaudeCredentials {
    readonly accessToken: string;
    readonly plan: string | null;
}

export function claudeAllowanceFromUsage(
    payload: unknown,
    plan: string | null
): SubscriptionAllowance {
    const usage = OAuthUsageSchema.parse(payload);
    const windows = [
        claudeWindow(usage.five_hour, ClaudeWindowMinutes.FIVE_HOUR),
        claudeWindow(usage.seven_day, ClaudeWindowMinutes.SEVEN_DAY)
    ];
    return {
        kind: HarnessKinds.CLAUDE,
        plan,
        windows: windows.filter((window): window is AllowanceWindow => window !== undefined)
    };
}

/**
 * Asks Anthropic what is left of the login the Claude CLI provisioned. The token is read from the
 * same Keychain entry the CLI writes, so the lab never holds a credential of its own.
 */
export async function readClaudeAllowance(signal?: AbortSignal): Promise<SubscriptionAllowance> {
    const credentials = await readClaudeCredentials(signal);
    const response = await fetch(CLAUDE_OAUTH_USAGE_URL, {
        headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            "anthropic-beta": CLAUDE_OAUTH_BETA
        },
        signal: allowanceDeadline(signal)
    });
    if (!response.ok) {
        throw new Error(claudeUsageRefusal(response.status));
    }

    return claudeAllowanceFromUsage(await response.json(), credentials.plan);
}

/**
 * Anthropic throttles the usage endpoint itself, so a refusal to answer is not a refusal to serve.
 * Saying which one happened keeps an operator from reading a throttled poll as a lost login.
 */
function claudeUsageRefusal(status: number): string {
    if (status === 401) {
        return "Claude rejected the stored OAuth login; sign in with the Claude CLI again";
    }
    if (status === 429) {
        return "Claude is rate-limiting the usage endpoint, not the subscription";
    }
    return `Claude did not report subscription usage (HTTP ${status})`;
}

async function readClaudeCredentials(signal?: AbortSignal): Promise<ClaudeCredentials> {
    const result = await execa(
        ClaudeCredentialStore.KEYCHAIN_BINARY,
        ["find-generic-password", "-s", ClaudeCredentialStore.KEYCHAIN_SERVICE, "-w"],
        { reject: false, stripFinalNewline: true, cancelSignal: allowanceDeadline(signal) }
    );
    if (result.failed || !result.stdout.trim()) {
        throw new Error(
            `No ${ClaudeCredentialStore.KEYCHAIN_SERVICE} entry in the Keychain; sign in with the Claude CLI`
        );
    }

    const oauth = KeychainCredentialsSchema.parse(JSON.parse(result.stdout)).claudeAiOauth;
    return { accessToken: oauth.accessToken, plan: oauth.subscriptionType ?? null };
}

function claudeWindow(
    window: z.infer<typeof UsageWindowSchema> | null | undefined,
    durationMinutes: number
): AllowanceWindow | undefined {
    if (window === null || window === undefined) {
        return undefined;
    }
    return {
        durationMinutes,
        usedPercent: window.utilization,
        resetsAt: allowanceInstant(
            window.resets_at === null || window.resets_at === undefined
                ? null
                : new Date(window.resets_at)
        )
    };
}
