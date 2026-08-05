export const WakeTrigger = {
    CAPABILITY: "capability",
    /** A subscription the investigation was waiting on came back, so nobody had to notice. */
    ALLOWANCE: "allowance",
    USER: "user"
} as const;
export type WakeTrigger = (typeof WakeTrigger)[keyof typeof WakeTrigger];
