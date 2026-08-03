export const WakeTrigger = {
    CAPABILITY: "capability",
    USER: "user"
} as const;
export type WakeTrigger = (typeof WakeTrigger)[keyof typeof WakeTrigger];
