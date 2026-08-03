/**
 * How far a direction has got, in the words the daemon writes onto a branch summary. A branch that
 * was paused by something outside the cycle carries that reason instead, so a reader has to treat
 * any other text as prose rather than as one of these.
 */
export const BranchProgress = {
    QUEUED: "Queued",
    RUNNING: "Running",
    FINISHED: "Finished",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    CAPABILITY_BLOCKED: "Blocked on a required capability"
} as const;
export type BranchProgress = (typeof BranchProgress)[keyof typeof BranchProgress];
