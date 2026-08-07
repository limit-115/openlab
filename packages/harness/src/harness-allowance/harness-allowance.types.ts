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
 * What one vendor answered when asked what is left of the operator's account. A tier and money are
 * separate fields because they are separate facts, and the same split the preflight already reports:
 * a vendor that sells tiers names one and states no money, a vendor that sells tokens states money
 * and has no tier. Putting money in `plan` would have the page render a wallet as though it were a
 * subscription the operator had bought.
 *
 * A vendor fills whichever meter it sells by — a subscription reports windows, a wallet reports
 * balances — and one that meters by neither answers with both empty, which is a reading that
 * succeeded and found nothing to meter rather than a reading that failed.
 */
export interface HarnessAllowanceReading {
    readonly kind: HarnessKind;
    /** The plan tier the vendor named. Null for a vendor that sells no tier. */
    readonly plan: string | null;
    /** What a token-billed account has left, per currency. Empty for a subscription. */
    readonly balances: readonly WalletBalance[];
    /**
     * The vendor has stopped serving this account, said outright rather than read off a meter. A
     * subscription says it through a window at its ceiling and leaves this false; a wallet has no
     * window to say it with, so an empty one would otherwise read as an account with everything
     * still to spend.
     */
    readonly spent: boolean;
    readonly windows: readonly AllowanceWindow[];
}

export type ReadHarnessAllowance = (signal?: AbortSignal) => Promise<HarnessAllowanceReading>;
