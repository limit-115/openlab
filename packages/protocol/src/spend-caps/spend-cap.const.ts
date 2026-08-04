/**
 * How far into a window the lab may spend when the operator has capped nothing. It is the vendor's
 * own ceiling, so an uncapped subscription is spent exactly as far as the vendor will serve it and
 * a lab nobody has configured dispatches as it always did.
 */
export const NO_SPEND_CAP_PERCENT = 100;

export const SpendCapRefusal = {
    DUPLICATE_WINDOW: "A subscription window carries one spend cap"
} as const;
