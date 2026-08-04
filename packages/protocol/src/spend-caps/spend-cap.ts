import type { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { NO_SPEND_CAP_PERCENT } from "#src/spend-caps/spend-cap.const";
import type { SpendCaps } from "#src/spend-caps/spend-cap.types";
import type {
    AllowanceWindow,
    SubscriptionAllowance
} from "#src/subscription-allowance/subscription-allowance.types";

/** How far into one window the lab may spend: the whole of it until an operator asks for less. */
export function windowSpendCap(
    caps: SpendCaps,
    harness: AgentHarnessKind,
    windowMinutes: number
): number {
    return (
        caps.find((cap) => cap.harness === harness && cap.window_minutes === windowMinutes)
            ?.max_used_percent ?? NO_SPEND_CAP_PERCENT
    );
}

/** Whether the operator has asked the lab to stop short of what the vendor would still serve. */
export function isCapped(cap: number): boolean {
    return cap < NO_SPEND_CAP_PERCENT;
}

/**
 * The windows that have reached the cap set on them. One of them withholds the whole subscription,
 * however much the others have left: the lab spends a subscription rather than a window, and the
 * vendor stops serving on whichever window runs out first anyway.
 *
 * Only a window an operator actually capped can be withheld. A window at the vendor's own ceiling is
 * a spent allowance, which is a different thing to report and a different thing to act on. And a
 * reading that failed carries no windows at all, so monitoring that broke never withholds a
 * subscription: the lab keeps dispatching and learns the limit from the vendor, as it did before
 * caps existed.
 */
export function withheldWindows(
    allowance: SubscriptionAllowance,
    caps: SpendCaps
): AllowanceWindow[] {
    return allowance.windows.filter((window) => {
        const cap = windowSpendCap(caps, allowance.harness, window.duration_minutes);
        return isCapped(cap) && window.used_percent >= cap;
    });
}
