import type { HarnessKind } from "#src/agent-harness/agent-harness.const";

/**
 * One rolling window a vendor meters, stated in the vendor's own terms. Nothing here is normalised
 * into a shared taxonomy: the window carries its own length so a vendor that adds a third window
 * needs no new name invented for it.
 */
export interface AllowanceWindow {
    readonly durationMinutes: number;
    /** Vendors report consumption rather than headroom, and none of them stops exactly at 100. */
    readonly usedPercent: number;
    readonly resetsAt: string | null;
}

/**
 * What one vendor answered when asked what is left of the operator's account. A tier and an amount
 * are separate fields because they are separate facts, and the same split the preflight already
 * reports: a vendor that sells tiers names one and states no balance, a vendor that sells tokens
 * states a balance and has no tier. Putting money in `plan` would have the page render a wallet as
 * though it were a subscription the operator had bought.
 */
export interface SubscriptionAllowance {
    readonly kind: HarnessKind;
    /** The plan tier the vendor named. Null for a vendor that sells no tier. */
    readonly plan: string | null;
    /** What a token-billed account has left to spend. Null for a subscription. */
    readonly balance: string | null;
    readonly windows: readonly AllowanceWindow[];
}

export type ReadSubscriptionAllowance = (signal?: AbortSignal) => Promise<SubscriptionAllowance>;
