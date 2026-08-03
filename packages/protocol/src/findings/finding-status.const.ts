/**
 * What happened to a researcher's claim after it was made. Nothing else can move a finding: the
 * daemon never judges a claim itself, it only records what the verifier said about it.
 */
export const FindingStatus = {
    UNVERIFIED: "unverified",
    CONFIRMED: "confirmed",
    REFUTED: "refuted"
} as const;
export type FindingStatus = (typeof FindingStatus)[keyof typeof FindingStatus];
