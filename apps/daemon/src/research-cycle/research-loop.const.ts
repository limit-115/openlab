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
    NO_DIRECTION: "The director could not name anywhere else worth looking"
} as const;
