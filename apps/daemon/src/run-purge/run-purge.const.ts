export const PurgeScope = {
    ALL: "all",
    EXCEPT_CURRENT: "except-current"
} as const;
export type PurgeScope = (typeof PurgeScope)[keyof typeof PurgeScope];
