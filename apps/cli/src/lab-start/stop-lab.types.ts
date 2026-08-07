/** What a stop needs from outside itself, which is a terminal, a clock and a way out. */
export interface StopLabOptions {
    /**
     * Whether anybody is watching. What the lab did is written either way; what the operator could
     * press is left out of a log nobody is reading.
     */
    readonly interactive?: boolean;
    /** How long the stop runs before the way out of waiting for it is offered. */
    readonly quitOfferAfterMs?: number;
    /** How the lab quits when the operator will not wait for it. */
    readonly quit?: (code: number) => void;
}
