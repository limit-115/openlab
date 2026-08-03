import { ALLOWANCE_TIMEOUT_MILLISECONDS } from "#src/subscription-allowance/subscription-allowance.const";

/**
 * Bounds one reading. A vendor that stopped answering must not hold up the work the reading was
 * taken for, so every reader carries its own deadline alongside whatever the caller passed in.
 */
export function allowanceDeadline(signal?: AbortSignal): AbortSignal {
    const deadline = AbortSignal.timeout(ALLOWANCE_TIMEOUT_MILLISECONDS);
    return signal === undefined ? deadline : AbortSignal.any([deadline, signal]);
}
