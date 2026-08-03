export const WakeTrigger = {
    CAPABILITY: "capability",
    FINDING: "finding",
    USER: "user"
} as const;
export type WakeTrigger = (typeof WakeTrigger)[keyof typeof WakeTrigger];
