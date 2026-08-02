export const ExperimentStatus = {
    PLANNED: "planned",
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    TIMED_OUT: "timed_out",
    CANCELLED: "cancelled"
} as const;
export type ExperimentStatus = (typeof ExperimentStatus)[keyof typeof ExperimentStatus];
