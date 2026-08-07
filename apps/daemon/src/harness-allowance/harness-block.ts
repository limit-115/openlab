import type { HarnessKind } from "@openlab/harness/agent-harness.const";
import { spentAllowanceError } from "@openlab/harness/spent-allowance";
import {
    ALLOWANCE_EXHAUSTED_PERCENT,
    HarnessAllowanceState
} from "@openlab/protocol/harness-allowance/harness-allowance.const";
import type {
    AllowanceWindow,
    HarnessAllowance
} from "@openlab/protocol/harness-allowance/harness-allowance.types";
import { latestWindowReset } from "@openlab/protocol/harness-allowance/window-reset";
import { windowSpendCap, withheldWindows } from "@openlab/protocol/spend-caps/spend-cap";
import type { SpendCaps } from "@openlab/protocol/spend-caps/spend-cap.types";
import { HarnessBlockKind } from "#src/harness-allowance/harness-block.const";
import type { HarnessBlock, HarnessBlockInput } from "#src/harness-allowance/harness-block.types";

/**
 * What is stopping the lab from spending one harness, decided before a run is prepared rather
 * than after one died on it.
 *
 * The vendor is asked first, because an account it has stopped serving is a fact about the
 * account rather than about the operator's wishes: it is reported as the capability it is, and
 * spending past the caps cannot buy past it. A cap is checked only afterwards, and only where the
 * operator set one — a spent window and a reading that failed both leave every cap out of it.
 */
export async function harnessBlock(input: HarnessBlockInput): Promise<HarnessBlock | undefined> {
    if (input.readings === undefined) {
        return undefined;
    }

    const allowance = await input.readings.read(input.kind, input.signal);
    if (allowance.state === HarnessAllowanceState.EXHAUSTED) {
        return spentBlock(input.kind, allowance);
    }
    if (input.spendPastCaps) {
        return undefined;
    }

    const withheld = withheldWindows(allowance, input.caps);
    return withheld.length === 0
        ? undefined
        : withheldBlock(input.kind, allowance, withheld, input.caps);
}

/** A harness that lost what it needs mid-run, carried in the same terms as the ones read ahead. */
export function unavailableBlock(kind: HarnessKind, reason: string): HarnessBlock {
    return { harness: kind, kind: HarnessBlockKind.UNAVAILABLE, reason };
}

/**
 * States when the allowance comes back, which is the only thing an operator can act on. The window
 * that ran out is not named: the vendor stops serving whatever else has headroom, so the wait is
 * the whole answer.
 */
export function spentAllowanceMessage(allowance: HarnessAllowance): string {
    const returns = latestWindowReset(spentWindows(allowance));
    return returns === undefined
        ? `The ${planName(allowance)} plan has no allowance left`
        : `The ${planName(allowance)} plan has no allowance left until ${returns}`;
}

function spentBlock(kind: HarnessKind, allowance: HarnessAllowance): HarnessBlock {
    const reason = spentAllowanceMessage(allowance);
    const returnsAt = latestWindowReset(spentWindows(allowance));
    return {
        harness: kind,
        kind: HarnessBlockKind.EXHAUSTED,
        reason,
        ...(returnsAt === undefined ? {} : { returnsAt }),
        /**
         * The refusal the vendor would have answered with, raised before a run is dispatched. It is
         * the same capability error a spent allowance produces mid-run, so the investigation falls
         * through to the next harness, asks the operator about this one, and hibernates on the
         * real reason exactly as it already did.
         */
        capabilityError: spentAllowanceError(kind, reason)
    };
}

function withheldBlock(
    kind: HarnessKind,
    allowance: HarnessAllowance,
    withheld: readonly AllowanceWindow[],
    caps: SpendCaps
): HarnessBlock {
    const returnsAt = latestWindowReset(withheld);
    return {
        harness: kind,
        kind: HarnessBlockKind.WITHHELD,
        reason: withheldMessage(allowance, withheld, caps),
        ...(returnsAt === undefined ? {} : { returnsAt })
    };
}

/**
 * Names the cap the operator set and how far past it the subscription is, because a held
 * subscription that still has allowance left only makes sense against the number it was held at.
 */
function withheldMessage(
    allowance: HarnessAllowance,
    withheld: readonly AllowanceWindow[],
    caps: SpendCaps
): string {
    const window = withheld[0];
    if (window === undefined) {
        return `The ${planName(allowance)} plan has reached its spend cap`;
    }
    const cap = windowSpendCap(caps, allowance.harness, window.duration_minutes);
    const spent = `The ${planName(allowance)} plan is ${Math.round(window.used_percent)}% into a window capped at ${cap}%`;
    const returns = latestWindowReset(withheld);
    return returns === undefined ? spent : `${spent}, and is held until ${returns}`;
}

/** The windows the vendor has stopped serving on, which are the ones the wait is measured by. */
function spentWindows(allowance: HarnessAllowance): AllowanceWindow[] {
    return allowance.windows.filter((window) => window.used_percent >= ALLOWANCE_EXHAUSTED_PERCENT);
}

function planName(allowance: HarnessAllowance): string {
    return allowance.plan ?? allowance.harness;
}
