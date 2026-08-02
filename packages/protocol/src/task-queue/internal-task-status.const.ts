export const InternalTaskStatus = {
    QUEUED: "queued",
    LEASED: "leased",
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    CANCELLED: "cancelled"
} as const;
export type InternalTaskStatus = (typeof InternalTaskStatus)[keyof typeof InternalTaskStatus];
