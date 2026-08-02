export const ExternalEffect = {
    NONE: "none",
    REVERSIBLE: "reversible",
    IRREVERSIBLE: "irreversible"
} as const;
export type ExternalEffect = (typeof ExternalEffect)[keyof typeof ExternalEffect];
