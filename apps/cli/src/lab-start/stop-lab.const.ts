/**
 * What takes a running lab down: Ctrl+C from the operator watching it, and the signal a service
 * manager sends the same lab. Both are somebody asking for the lab to stop rather than anything
 * going wrong, so both end in the same goodbye.
 */
export const ShutdownSignal = {
    INTERRUPT: "SIGINT",
    TERMINATE: "SIGTERM"
} as const;
export type ShutdownSignal = (typeof ShutdownSignal)[keyof typeof ShutdownSignal];

/**
 * How long a stop may take before the operator is offered the way out of waiting for it. Long
 * enough that the interrupt a script runner forwards, which lands within milliseconds of the one
 * the operator sent, can never be taken for the operator asking again.
 */
export const QUIT_OFFER_AFTER_MS = 1_000;

/**
 * What a process interrupted on its way through something ends with: 128 plus the signal. An
 * operator who would not wait for the stop gets exactly that, because that is what happened.
 */
export const FORCED_STOP_EXIT_CODE = 130;
