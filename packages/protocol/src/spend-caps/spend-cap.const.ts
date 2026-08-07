/**
 * How far into a window the lab may spend when the operator has capped nothing. It is the vendor's
 * own ceiling, so an uncapped subscription is spent exactly as far as the vendor will serve it and
 * a lab nobody has configured dispatches as it always did.
 */
export const NO_SPEND_CAP_PERCENT = 100;

/**
 * What an operator can tell the lab to stop short of. A subscription is metered as a share of a
 * rolling window, so the cap on one is a percentage; a wallet is metered as money left, so the cap on
 * one is a floor under the balance. They are one setting rather than two because they are one
 * instruction — stop spending this harness here — and everything downstream treats them alike: the
 * gate that passes a harness over before a run is prepared, the hibernation that says why, and the
 * wake that frees work as soon as a cap is loosened.
 */
export const SpendCapKinds = {
    WINDOW_PERCENT: "window_percent",
    WALLET_FLOOR: "wallet_floor"
} as const;
export type SpendCapKind = (typeof SpendCapKinds)[keyof typeof SpendCapKinds];

export const SpendCapRefusal = {
    DUPLICATE_WINDOW: "A subscription window carries one spend cap",
    DUPLICATE_WALLET: "A wallet currency carries one spend floor"
} as const;
