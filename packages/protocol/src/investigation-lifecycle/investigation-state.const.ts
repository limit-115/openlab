export const InvestigationState = {
    RUNNING: "RUNNING",
    /** A finding survived independent verification. The investigation pauses and waits for the team. */
    BREAKTHROUGH: "BREAKTHROUGH",
    HIBERNATING: "HIBERNATING",
    STOPPED: "STOPPED",
    FAILED: "FAILED"
} as const;
export type InvestigationState = (typeof InvestigationState)[keyof typeof InvestigationState];
