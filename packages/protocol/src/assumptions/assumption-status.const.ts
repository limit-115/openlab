/**
 * How far a director's bet has got. A bet is open until a researcher takes it, exhausted once that
 * researcher came back with nothing, with a claim the verifier refuted, or with one the verifier
 * confirmed true but which does not reach the goal, and confirmed only when a verified claim reaches
 * the goal.
 */
export const AssumptionStatus = {
    OPEN: "open",
    RESEARCHING: "researching",
    EXHAUSTED: "exhausted",
    CONFIRMED: "confirmed"
} as const;
export type AssumptionStatus = (typeof AssumptionStatus)[keyof typeof AssumptionStatus];
