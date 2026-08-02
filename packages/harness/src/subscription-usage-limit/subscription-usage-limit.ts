import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import { HarnessDiagnosticLevels, HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import type { ParsedHarnessEvent } from "#src/agent-harness/harness-event-parser.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { SUBSCRIPTION_USAGE_LIMIT_PATTERNS } from "#src/subscription-usage-limit/subscription-usage-limit.const";

export function isSubscriptionUsageLimit(message: string): boolean {
    return SUBSCRIPTION_USAGE_LIMIT_PATTERNS.some((pattern) => pattern.test(message));
}

/** The vendor sentence behind an error diagnostic that reports a spent subscription allowance. */
export function subscriptionUsageLimitMessage(event: ParsedHarnessEvent): string | undefined {
    return event.type === HarnessEventTypes.DIAGNOSTIC &&
        event.level === HarnessDiagnosticLevels.ERROR &&
        isSubscriptionUsageLimit(event.message)
        ? event.message
        : undefined;
}

/**
 * A spent allowance is an operator-held account problem, never a broken event stream. Reporting it
 * as a capability error is what lets the daemon fall back to another subscription, ask the operator
 * for the one that ran out, and hibernate on the real reason instead of on a parser complaint. The
 * vendor sentence is carried through verbatim because it names when the allowance returns.
 */
export function subscriptionUsageLimitError(
    harness: HarnessKind,
    vendorMessage: string
): HarnessCapabilityError {
    return new HarnessCapabilityError(
        harness,
        `${harness} subscription usage limit reached: ${vendorMessage}`,
        {
            need: `Remaining allowance on the ${harness} product subscription`,
            reason: vendorMessage,
            provisioningHint: `Wait for the ${harness} allowance to reset, raise the plan, or sign in to another subscription, then retry; usage-based API billing is forbidden`
        }
    );
}
