export const AttemptStatus = {
    PLANNED: "planned",
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    TIMED_OUT: "timed_out",
    CANCELLED: "cancelled"
} as const;
export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus];

export const EvidenceRelationship = {
    SUPPORTS: "supports",
    CONTRADICTS: "contradicts"
} as const;
export type EvidenceRelationship = (typeof EvidenceRelationship)[keyof typeof EvidenceRelationship];
