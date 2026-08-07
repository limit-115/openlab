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
 * What one currency of a wallet holds. The amount stays a decimal string the whole way through: it
 * is money, and a float would round the one number an operator sets a floor against.
 */
export interface WalletBalance {
    readonly currency: string;
    readonly amount: string;
}

/**
 * What one vendor answered when asked what is left of the operator's account. A vendor fills
 * whichever of the two meters it sells by — a subscription reports windows, a wallet reports
 * balances — and a vendor that meters by neither answers with both empty, which is a reading that
 * succeeded and found nothing to meter rather than a reading that failed.
 */
export interface SubscriptionAllowance {
    readonly kind: HarnessKind;
    /** The plan tier the vendor named, which is what identifies the account that answered. */
    readonly plan: string | null;
    readonly windows: readonly AllowanceWindow[];
    readonly balances: readonly WalletBalance[];
}

export type ReadSubscriptionAllowance = (signal?: AbortSignal) => Promise<SubscriptionAllowance>;
