import type { HarnessPreflight } from "@openlab/harness/agent-harness.types";
import { HarnessCapabilityError } from "@openlab/harness/harness-error";
import {
    type HarnessCapabilityGap,
    HarnessCapabilityGaps
} from "@openlab/harness/harness-error.const";
import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { HarnessReadinessState } from "@openlab/protocol/harness-readiness/harness-readiness.const";
import type { HarnessReadiness } from "@openlab/protocol/harness-readiness/harness-readiness.types";

/**
 * What each gap means for someone who wants to start the lab. A spent allowance cannot come out of a
 * preflight — it is found in a run's event stream, long after the CLI has proven itself — so there
 * is nothing truthful to say about readiness if one ever arrives here, and it is reported as read.
 */
const READINESS_FOR_GAP: Record<HarnessCapabilityGap, HarnessReadinessState> = {
    [HarnessCapabilityGaps.INSTALLATION]: HarnessReadinessState.NOT_INSTALLED,
    [HarnessCapabilityGaps.CREDENTIAL]: HarnessReadinessState.NOT_SIGNED_IN,
    [HarnessCapabilityGaps.ALLOWANCE]: HarnessReadinessState.UNREADABLE
};

export function readyHarness(preflight: HarnessPreflight, checkedAt: string): HarnessReadiness {
    return {
        harness: preflight.kind,
        state: HarnessReadinessState.READY,
        cli_version: preflight.cliVersion,
        plan: preflight.authentication.subscription,
        balance: preflight.authentication.wallet,
        error: null,
        checked_at: checkedAt
    };
}

/**
 * A harness that refused. The vendor's own sentence is carried through rather than replaced with a
 * house one: it is the part that names what went wrong on this machine, and the page needs it
 * whenever the lab cannot say more than that the check failed.
 */
export function unreadyHarness(
    kind: AgentHarnessKind,
    failure: unknown,
    checkedAt: string
): HarnessReadiness {
    return {
        harness: kind,
        state:
            failure instanceof HarnessCapabilityError
                ? READINESS_FOR_GAP[failure.gap]
                : HarnessReadinessState.UNREADABLE,
        cli_version: null,
        plan: null,
        balance: null,
        error: failure instanceof Error ? failure.message : String(failure),
        checked_at: checkedAt
    };
}
