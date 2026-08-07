/**
 * What the lab may do with a subscription once the vendor has been asked what is left of it.
 * `UNREADABLE` is deliberately not `EXHAUSTED`: a monitoring call that failed says nothing about the
 * allowance, and stopping the lab on it would turn a broken reading into a stopped lab.
 */
export const HarnessAllowanceState = {
    AVAILABLE: "available",
    EXHAUSTED: "exhausted",
    UNREADABLE: "unreadable"
} as const;
export type HarnessAllowanceState =
    (typeof HarnessAllowanceState)[keyof typeof HarnessAllowanceState];

/** The share of a window a vendor stops serving at. */
export const ALLOWANCE_EXHAUSTED_PERCENT = 100;
