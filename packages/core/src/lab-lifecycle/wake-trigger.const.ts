export const WakeTrigger = {
    CAPABILITY: "capability",
    EVIDENCE: "evidence",
    MODEL: "model",
    USER: "user"
} as const;
export type WakeTrigger = (typeof WakeTrigger)[keyof typeof WakeTrigger];
