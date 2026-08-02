export const EXECUTION_STATUS = {
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    TIMED_OUT: "timed_out",
    CANCELLED: "cancelled",
    SPAWN_ERROR: "spawn_error"
} as const;

export type ExecutionStatus = (typeof EXECUTION_STATUS)[keyof typeof EXECUTION_STATUS];

export const DECLARED_OUTPUT_STATUS = {
    RECORDED: "recorded",
    MISSING: "missing",
    INVALID: "invalid"
} as const;
export type DeclaredOutputStatus =
    (typeof DECLARED_OUTPUT_STATUS)[keyof typeof DECLARED_OUTPUT_STATUS];
