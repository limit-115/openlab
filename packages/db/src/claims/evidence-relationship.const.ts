export const EvidenceRelationship = {
    CITES: "cites",
    SUPPORTS: "supports",
    CONTRADICTS: "contradicts"
} as const;
export type EvidenceRelationship = (typeof EvidenceRelationship)[keyof typeof EvidenceRelationship];
