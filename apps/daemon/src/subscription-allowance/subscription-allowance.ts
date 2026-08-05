import type { HarnessKind } from "@nightlab/harness/agent-harness.const";
import type { SubscriptionAllowance as HarnessAllowance } from "@nightlab/harness/subscription-allowance.types";
import {
    ALLOWANCE_EXHAUSTED_PERCENT,
    SubscriptionAllowanceState
} from "@nightlab/protocol/subscription-allowance/subscription-allowance.const";
import type {
    AllowanceWindow,
    SubscriptionAllowance
} from "@nightlab/protocol/subscription-allowance/subscription-allowance.types";

/**
 * Classifies what a vendor answered into what the lab may do with that subscription. A window at
 * its ceiling exhausts the plan on its own: the vendor stops serving on whichever window ran out
 * first, however much the others have left.
 */
export function allowanceFromReading(
    reading: HarnessAllowance,
    readAt: string
): SubscriptionAllowance {
    const windows = reading.windows.map(
        (window): AllowanceWindow => ({
            duration_minutes: window.durationMinutes,
            used_percent: window.usedPercent,
            resets_at: window.resetsAt
        })
    );

    return {
        harness: reading.kind,
        state: windows.some((window) => window.used_percent >= ALLOWANCE_EXHAUSTED_PERCENT)
            ? SubscriptionAllowanceState.EXHAUSTED
            : SubscriptionAllowanceState.AVAILABLE,
        plan: reading.plan,
        windows,
        error: null,
        read_at: readAt
    };
}

/**
 * A vendor that could not be asked is reported as unread, never as spent. The lab keeps dispatching
 * to it: refusing work because monitoring broke would cost more than the reading is worth.
 */
export function unreadableAllowance(
    kind: HarnessKind,
    cause: unknown,
    readAt: string
): SubscriptionAllowance {
    return {
        harness: kind,
        state: SubscriptionAllowanceState.UNREADABLE,
        plan: null,
        windows: [],
        error: cause instanceof Error ? cause.message : String(cause),
        read_at: readAt
    };
}
