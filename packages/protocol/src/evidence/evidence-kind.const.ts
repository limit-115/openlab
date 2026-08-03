export const EvidenceKind = {
    EXPERIMENT: "experiment",
    ARTIFACT: "artifact",
    COUNTEREXAMPLE: "counterexample",
    VERIFIER_RESULT: "verifier_result"
} as const;
export type EvidenceKind = (typeof EvidenceKind)[keyof typeof EvidenceKind];
