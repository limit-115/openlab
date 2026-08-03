export const EvidenceOrigin = {
    EMPIRICAL: "empirical",
    MODEL_JUDGEMENT: "model_judgement",
    VERIFIER: "verifier"
} as const;
export type EvidenceOrigin = (typeof EvidenceOrigin)[keyof typeof EvidenceOrigin];
