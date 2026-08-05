/**
 * What the lab found when it asked a harness whether it could run right now. The three failing
 * states are three different jobs for the operator — install it, sign it in, or look at what went
 * wrong — and a page that cannot tell them apart can only say "it does not work".
 *
 * `UNREADABLE` is deliberately not `NOT_INSTALLED`: a check that timed out or died on something
 * unexpected has not established that the CLI is missing, and telling an operator to install what
 * they already have sends them after the wrong thing.
 */
export const HarnessReadinessState = {
    READY: "ready",
    NOT_INSTALLED: "not_installed",
    NOT_SIGNED_IN: "not_signed_in",
    UNREADABLE: "unreadable"
} as const;
export type HarnessReadinessState =
    (typeof HarnessReadinessState)[keyof typeof HarnessReadinessState];
