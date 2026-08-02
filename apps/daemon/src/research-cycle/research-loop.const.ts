export const ResearchLoopOutcomeStatus = {
    COMPLETED: "completed",
    HIBERNATING: "hibernating",
    CANCELLED: "cancelled",
    FAILED: "failed"
} as const;
export type ResearchLoopOutcomeStatus =
    (typeof ResearchLoopOutcomeStatus)[keyof typeof ResearchLoopOutcomeStatus];

export const BranchProgress = {
    RUNNING: "Running",
    FINISHED: "Finished",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    CAPABILITY_BLOCKED: "Blocked on a required capability"
} as const;

export const PromiseSettlement = {
    FULFILLED: "fulfilled",
    REJECTED: "rejected"
} as const;

export const DEFAULT_PLATEAU_INACTIVITY_MS = 60_000;
export const DEFAULT_CYCLE_BACKOFF_MS = 5_000;
