export const LabState = {
    RUNNING: "RUNNING",
    /** A finding survived independent verification. The lab pauses and waits for the team. */
    BREAKTHROUGH: "BREAKTHROUGH",
    HIBERNATING: "HIBERNATING",
    STOPPED: "STOPPED",
    FAILED: "FAILED"
} as const;
export type LabState = (typeof LabState)[keyof typeof LabState];
