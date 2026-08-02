export const EvidenceOrigin = {
    DAEMON_FETCHED_SOURCE: "daemon_fetched_source",
    EMPIRICAL: "empirical",
    MODEL_JUDGEMENT: "model_judgement",
    PRIMARY_SOURCE: "primary_source",
    VERIFIER: "verifier"
} as const;
export type EvidenceOrigin = (typeof EvidenceOrigin)[keyof typeof EvidenceOrigin];
