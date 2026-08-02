export const EvidenceOrigin = {
    EMPIRICAL: "empirical",
    MODEL_JUDGEMENT: "model_judgement",
    PRIMARY_SOURCE: "primary_source",
    VERIFIER: "verifier"
} as const;
export type EvidenceOrigin = (typeof EvidenceOrigin)[keyof typeof EvidenceOrigin];

export const WakeTrigger = {
    CAPABILITY: "capability",
    EVIDENCE: "evidence",
    MODEL: "model",
    TOOL: "tool",
    USER: "user"
} as const;
export type WakeTrigger = (typeof WakeTrigger)[keyof typeof WakeTrigger];

export const SchedulerLane = {
    PROMISING: "promising",
    EXPLORATION: "exploration",
    ADVERSARIAL: "adversarial",
    REPRODUCTION: "reproduction"
} as const;
export type SchedulerLane = (typeof SchedulerLane)[keyof typeof SchedulerLane];

export const ProgressKind = {
    COUNTEREVIDENCE: "counterevidence",
    EVALUATOR_FIX: "evaluator_fix",
    EVIDENCE: "evidence",
    EXCLUDED_APPROACH: "excluded_approach",
    NARROWED_CLAIM: "narrowed_claim",
    REPRODUCTION: "reproduction"
} as const;
export type ProgressKind = (typeof ProgressKind)[keyof typeof ProgressKind];
