import type { HarnessKind } from "@lab/harness/agent-harness.const";
import type { HarnessCapabilityError } from "@lab/harness/harness-error";
import { subscriptionUsageLimitError } from "@lab/harness/subscription-usage-limit";
import {
    ALLOWANCE_EXHAUSTED_PERCENT,
    SubscriptionAllowanceState
} from "@lab/protocol/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowance } from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import type { SubscriptionAllowanceReadings } from "#src/subscription-allowance/subscription-allowance-readings";

/**
 * The refusal the vendor would have answered with, raised before a run is dispatched rather than
 * after one died on it. It is the same capability error a spent allowance produces mid-run, so the
 * investigation falls through to the next subscription, asks the operator about this one, and hibernates on
 * the real reason exactly as it already did.
 *
 * Without readings wired in there is no gate: an investigation that cannot see the allowance dispatches and
 * learns from the vendor, which is how it worked before this existed.
 */
export async function spentAllowanceError(
    readings: SubscriptionAllowanceReadings | undefined,
    kind: HarnessKind,
    signal?: AbortSignal
): Promise<HarnessCapabilityError | undefined> {
    if (readings === undefined) {
        return undefined;
    }

    const allowance = await readings.read(kind, signal);
    if (allowance.state !== SubscriptionAllowanceState.EXHAUSTED) {
        return undefined;
    }

    return subscriptionUsageLimitError(kind, spentAllowanceMessage(allowance));
}

/**
 * States when the allowance comes back, which is the only thing an operator can act on. The window
 * that ran out is not named: the vendor stops serving whatever else has headroom, so the wait is
 * the whole answer.
 */
export function spentAllowanceMessage(allowance: SubscriptionAllowance): string {
    const plan = allowance.plan ?? allowance.harness;
    const returns = latestReset(allowance);
    return returns === undefined
        ? `The ${plan} plan has no allowance left`
        : `The ${plan} plan has no allowance left until ${returns}`;
}

/**
 * The last of the spent windows to come back. Only the spent ones count: a weekly window with
 * headroom may well reset later, and waiting for it would park a plan that is already serving
 * again.
 */
function latestReset(allowance: SubscriptionAllowance): string | undefined {
    return allowance.windows
        .flatMap((window) =>
            window.used_percent >= ALLOWANCE_EXHAUSTED_PERCENT && window.resets_at !== null
                ? [window.resets_at]
                : []
        )
        .sort()
        .at(-1);
}
