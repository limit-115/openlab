/**
 * How far a director's lead has got. A lead is open until a researcher takes it, exhausted once that
 * researcher came back with nothing, with a claim the verifier refuted, or with one the verifier
 * confirmed true but which does not reach the goal, and confirmed only when a verified claim reaches
 * the goal.
 */
export const LeadStatus = {
    OPEN: "open",
    RESEARCHING: "researching",
    EXHAUSTED: "exhausted",
    CONFIRMED: "confirmed"
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];
