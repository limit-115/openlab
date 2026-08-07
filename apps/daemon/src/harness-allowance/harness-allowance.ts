import type { HarnessKind } from "@openlab/harness/agent-harness.const";
import type { HarnessAllowanceReading } from "@openlab/harness/harness-allowance.types";
import {
    ALLOWANCE_EXHAUSTED_PERCENT,
    HarnessAllowanceState
} from "@openlab/protocol/harness-allowance/harness-allowance.const";
import type {
    AllowanceWindow,
    HarnessAllowance
} from "@openlab/protocol/harness-allowance/harness-allowance.types";

/**
 * Classifies what a vendor answered into what the lab may do with that harness. A window at
 * its ceiling exhausts the plan on its own: the vendor stops serving on whichever window ran out
 * first, however much the others have left.
 *
 * A vendor that says outright it has stopped serving is taken at its word, which is the only thing
 * an empty wallet can say — it meters no window, so there is no ceiling for it to have reached.
 */
export function allowanceFromReading(
    reading: HarnessAllowanceReading,
    readAt: string
): HarnessAllowance {
    const windows = reading.windows.map(
        (window): AllowanceWindow => ({
            duration_minutes: window.durationMinutes,
            used_percent: window.usedPercent,
            resets_at: window.resetsAt
        })
    );

    return {
        harness: reading.kind,
        state:
            reading.spent ||
            windows.some((window) => window.used_percent >= ALLOWANCE_EXHAUSTED_PERCENT)
                ? HarnessAllowanceState.EXHAUSTED
                : HarnessAllowanceState.AVAILABLE,
        plan: reading.plan,
        windows,
        /**
         * Money the vendor stated, carried across unchanged. A wallet is never read as exhausted
         * here however low it has fallen: an empty wallet is the vendor's own refusal to serve, and
         * DeepSeek says that outright at preflight, while everything above empty is the operator's
         * to draw a line under.
         */
        balances: [...reading.balances],
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
): HarnessAllowance {
    return {
        harness: kind,
        state: HarnessAllowanceState.UNREADABLE,
        plan: null,
        windows: [],
        balances: [],
        error: cause instanceof Error ? cause.message : String(cause),
        read_at: readAt
    };
}
