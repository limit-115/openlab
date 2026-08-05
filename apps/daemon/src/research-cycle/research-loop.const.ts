export const ResearchLoopOutcomeStatus = {
    BREAKTHROUGH: "breakthrough",
    HIBERNATING: "hibernating",
    CANCELLED: "cancelled",
    FAILED: "failed"
} as const;
export type ResearchLoopOutcomeStatus =
    (typeof ResearchLoopOutcomeStatus)[keyof typeof ResearchLoopOutcomeStatus];

export const PromiseSettlement = {
    FULFILLED: "fulfilled",
    REJECTED: "rejected"
} as const;

export const DEFAULT_CYCLE_BACKOFF_MS = 5_000;

export const HibernationReason = {
    NO_HARNESS: "No subscription-authenticated agent CLI harness is available",
    NO_DIRECTION: "The director could not name anywhere else worth looking",
    SPEND_CAP: "Every subscription this investigation may use has reached the spend cap set on it"
} as const;

/**
 * How long past a window's reset the investigation waits before it comes back. The allowance
 * readings stand for a minute at a time, so waking exactly on the reset would read the numbers from
 * before it and park the investigation again; a few minutes' margin buys a reading worth acting on.
 */
export const RESUME_MARGIN_MS = 300_000;
