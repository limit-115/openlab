import { AgentHarnessBilling, HARNESS_BILLING } from "@openlab/protocol/agents/agent-billing.const";
import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import { HarnessDiagnosticLevels, HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import type { ParsedHarnessEvent } from "#src/agent-harness/harness-event-parser.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { HarnessCapabilityGaps } from "#src/cli-execution/harness-error.const";
import { SPENT_ALLOWANCE_PATTERNS } from "#src/spent-allowance/spent-allowance.const";

export function isSpentAllowance(message: string): boolean {
    return SPENT_ALLOWANCE_PATTERNS.some((pattern) => pattern.test(message));
}

/** The vendor sentence behind an error diagnostic that reports an account it will not serve. */
export function spentAllowanceMessage(event: ParsedHarnessEvent): string | undefined {
    return event.type === HarnessEventTypes.DIAGNOSTIC &&
        event.level === HarnessDiagnosticLevels.ERROR &&
        isSpentAllowance(event.message)
        ? event.message
        : undefined;
}

/**
 * A spent allowance is an operator-held account problem, never a broken event stream. Reporting it
 * as a capability error is what lets the daemon fall back to another harness, ask the operator for
 * the one that ran out, and hibernate on the real reason instead of on a parser complaint. The
 * vendor sentence is carried through verbatim because it is the part that names what ran out.
 *
 * What the operator is asked to do about it depends on what pays for the harness, so it is taken
 * from the billing rather than assumed: a plan comes back on its own and can be waited out, and a
 * wallet does not come back at all until someone puts money in it.
 */
export function spentAllowanceError(
    harness: HarnessKind,
    vendorMessage: string
): HarnessCapabilityError {
    return HARNESS_BILLING[harness] === AgentHarnessBilling.SUBSCRIPTION
        ? spentSubscriptionError(harness, vendorMessage)
        : spentWalletError(harness, vendorMessage);
}

function spentSubscriptionError(
    harness: HarnessKind,
    vendorMessage: string
): HarnessCapabilityError {
    return new HarnessCapabilityError(
        harness,
        HarnessCapabilityGaps.ALLOWANCE,
        `${harness} subscription allowance is spent: ${vendorMessage}`,
        {
            need: `Remaining allowance on the ${harness} subscription`,
            reason: vendorMessage,
            provisioningHint: `Wait for the ${harness} allowance to reset, raise the plan, or sign in to another subscription, then retry`
        }
    );
}

/**
 * A token-billed vendor stops for two different reasons — an empty balance and a throttle — and the
 * lab cannot tell them apart from the sentence it was given. Both are named rather than guessed at,
 * because the vendor's own sentence is carried directly above this and already says which one it is.
 */
function spentWalletError(harness: HarnessKind, vendorMessage: string): HarnessCapabilityError {
    return new HarnessCapabilityError(
        harness,
        HarnessCapabilityGaps.ALLOWANCE,
        `${harness} is billed by the token and the vendor stopped serving the account: ${vendorMessage}`,
        {
            need: `A ${harness} account the vendor will still serve`,
            reason: vendorMessage,
            provisioningHint: `Add balance to the ${harness} account or wait out the vendor's rate limit, then retry`
        }
    );
}
