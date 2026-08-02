export const ProgressKind = {
    COUNTEREVIDENCE: "counterevidence",
    EVALUATOR_FIX: "evaluator_fix",
    EVIDENCE: "evidence",
    EXCLUDED_APPROACH: "excluded_approach",
    NARROWED_CLAIM: "narrowed_claim",
    REPRODUCTION: "reproduction"
} as const;
export type ProgressKind = (typeof ProgressKind)[keyof typeof ProgressKind];
