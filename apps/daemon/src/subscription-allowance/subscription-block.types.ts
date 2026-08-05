import type { HarnessKind } from "@nightlab/harness/agent-harness.const";
import type { HarnessCapabilityError } from "@nightlab/harness/harness-error";
import type { SpendCaps } from "@nightlab/protocol/spend-caps/spend-cap.types";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";
import type { SubscriptionBlockKind } from "#src/subscription-allowance/subscription-block.const";

/** One subscription the lab may not spend right now, and everything an operator can act on. */
export interface SubscriptionBlock {
    readonly harness: HarnessKind;
    readonly kind: SubscriptionBlockKind;
    /** Prose that says what stopped this subscription, in the vendor's or the operator's terms. */
    readonly reason: string;
    /** When it may be dispatched to again, where the vendor stated the reset. */
    readonly returnsAt?: string;
    /**
     * The vendor's refusal, raised as the capability request it is. A cap of the operator's own
     * carries none: they set it, so there is nothing to ask them for.
     */
    readonly capabilityError?: HarnessCapabilityError;
}

export interface SubscriptionBlockInput {
    /** Absent leaves the lab dispatching blind, learning a spent allowance from the vendor. */
    readonly readings?: SubscriptionAllowanceReadings;
    readonly caps: SpendCaps;
    readonly kind: HarnessKind;
    /** This investigation was told to spend past the caps, so only the vendor can stop it. */
    readonly spendPastCaps: boolean;
    readonly signal?: AbortSignal;
}
