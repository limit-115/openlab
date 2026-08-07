import type { HarnessKind } from "@openlab/harness/agent-harness.const";
import type { HarnessCapabilityError } from "@openlab/harness/harness-error";
import type { SpendCaps } from "@openlab/protocol/spend-caps/spend-cap.types";
import type { HarnessAllowanceReadings } from "#src/harness-allowance/harness-allowance-readings";
import type { HarnessBlockKind } from "#src/harness-allowance/harness-block.const";

/** One harness the lab may not spend right now, and everything an operator can act on. */
export interface HarnessBlock {
    readonly harness: HarnessKind;
    readonly kind: HarnessBlockKind;
    /** Prose that says what stopped this harness, in the vendor's or the operator's terms. */
    readonly reason: string;
    /** When it may be dispatched to again, where the vendor stated the reset. */
    readonly returnsAt?: string;
    /**
     * The vendor's refusal, raised as the capability request it is. A cap of the operator's own
     * carries none: they set it, so there is nothing to ask them for.
     */
    readonly capabilityError?: HarnessCapabilityError;
}

export interface HarnessBlockInput {
    /** Absent leaves the lab dispatching blind, learning a spent allowance from the vendor. */
    readonly readings?: HarnessAllowanceReadings;
    readonly caps: SpendCaps;
    readonly kind: HarnessKind;
    /** This investigation was told to spend past the caps, so only the vendor can stop it. */
    readonly spendPastCaps: boolean;
    readonly signal?: AbortSignal;
}
