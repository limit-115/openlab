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

/** What one vendor answered when asked what is left of the operator's subscription. */
export interface SubscriptionAllowance {
    readonly kind: HarnessKind;
    /** The plan tier the vendor named, which is what identifies the account that answered. */
    readonly plan: string | null;
    readonly windows: readonly AllowanceWindow[];
}

export type ReadSubscriptionAllowance = (signal?: AbortSignal) => Promise<SubscriptionAllowance>;
