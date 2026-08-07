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
        state: windows.some((window) => window.used_percent >= ALLOWANCE_EXHAUSTED_PERCENT)
            ? HarnessAllowanceState.EXHAUSTED
            : HarnessAllowanceState.AVAILABLE,
        plan: reading.plan,
        balance: reading.balance,
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
): HarnessAllowance {
    return {
        harness: kind,
        state: HarnessAllowanceState.UNREADABLE,
        plan: null,
        balance: null,
        windows: [],
        error: cause instanceof Error ? cause.message : String(cause),
        read_at: readAt
    };
}
