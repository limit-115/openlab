import type { AllowanceWindow } from "#src/harness-allowance/harness-allowance.types";

/**
 * The last of these windows to come back. Whatever stopped a subscription — the vendor's own
 * ceiling or the operator's cap — it is serving again only once every window that is out has reset,
 * so the latest of them is the answer and an earlier one would promise work the lab cannot do.
 *
 * The readings are UTC timestamps, so the latest is also the last in text order. A vendor that
 * states no reset time leaves the answer unknown rather than guessed at.
 */
export function latestWindowReset(windows: readonly AllowanceWindow[]): string | undefined {
    return windows
        .flatMap((window) => (window.resets_at === null ? [] : [window.resets_at]))
        .sort()
        .at(-1);
}
