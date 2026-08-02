export const LabState = {
    RUNNING: "RUNNING",
    HIBERNATING: "HIBERNATING",
    COMPLETED: "COMPLETED",
    STOPPED: "STOPPED",
    FAILED: "FAILED"
} as const;
export type LabState = (typeof LabState)[keyof typeof LabState];
