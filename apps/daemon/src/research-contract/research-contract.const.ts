export const RESEARCH_OUTCOME = {
    SUPPORTED: "supported",
    REFUTED: "refuted",
    INCONCLUSIVE: "inconclusive"
} as const;

export const CRITIC_VERDICT = {
    CREDIBLE: "credible",
    WEAK: "weak",
    REFUTED: "refuted"
} as const;

export const VERIFIER_VERDICT = {
    REPRODUCED: "reproduced",
    REFUTED: "refuted",
    INCONCLUSIVE: "inconclusive"
} as const;

export const EVALUATOR_VERDICT = {
    SUPPORTS: "supports",
    CONTRADICTS: "contradicts",
    INCONCLUSIVE: "inconclusive"
} as const;

export const RESEARCH_TARGET_KIND = {
    CLAIM: "claim",
    ASSUMPTION: "assumption"
} as const;
export type ResearchTargetKind = (typeof RESEARCH_TARGET_KIND)[keyof typeof RESEARCH_TARGET_KIND];

export const DIRECTOR_PLAN_VALIDATION_ERROR = {
    MISSING_OPERATIONAL_CRITERION:
        "A task without supplied success criteria requires at least one explicit falsifiable assumption"
} as const;
