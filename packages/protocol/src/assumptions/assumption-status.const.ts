/**
 * How far a director's bet has got. A bet is open until a researcher takes it, exhausted once that
 * researcher came back with nothing or with a claim the verifier refuted, and confirmed when its
 * claim survived verification.
 */
export const AssumptionStatus = {
    OPEN: "open",
    RESEARCHING: "researching",
    EXHAUSTED: "exhausted",
    CONFIRMED: "confirmed"
} as const;
export type AssumptionStatus = (typeof AssumptionStatus)[keyof typeof AssumptionStatus];
