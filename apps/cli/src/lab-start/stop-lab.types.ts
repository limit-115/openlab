import type { KeyboardStream } from "#src/lab-start/control-keys.types";

/** What a stop needs from outside itself, which is a terminal, a clock and a way out. */
export interface StopLabOptions {
    /**
     * Whether anybody is watching. What the lab did is written either way; what the operator could
     * press is left out of a log nobody is reading.
     */
    readonly interactive?: boolean;
    /** The terminal whose keys are read, when there is somebody at one. */
    readonly keyboard?: KeyboardStream | undefined;
    /** How close behind an interrupt another one is that same interrupt rather than a second press. */
    readonly samePressWithinMs?: number;
    /** How long the question about stopping stands before the lab goes back to running. */
    readonly confirmWithinMs?: number;
    /** How long the stop runs before the way out of waiting for it is offered. */
    readonly quitOfferAfterMs?: number;
    /** How the lab quits when the operator will not wait for it. */
    readonly quit?: (code: number) => void;
}
