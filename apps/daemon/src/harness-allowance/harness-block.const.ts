/**
 * Why the lab will not dispatch to a harness. The two are kept apart because they are acted on
 * differently: a vendor that has stopped serving is a capability the operator has to restore, while
 * a cap is the operator's own instruction and needs nothing from them at all.
 */
export const HarnessBlockKind = {
    EXHAUSTED: "exhausted",
    WITHHELD: "withheld",
    /** The harness lost something it needs mid-run: a session, a CLI, a login. */
    UNAVAILABLE: "unavailable"
} as const;
export type HarnessBlockKind = (typeof HarnessBlockKind)[keyof typeof HarnessBlockKind];
