export const EvidenceRelationship = {
    SUPPORTS: "supports",
    CONTRADICTS: "contradicts"
} as const;
export type EvidenceRelationship = (typeof EvidenceRelationship)[keyof typeof EvidenceRelationship];
