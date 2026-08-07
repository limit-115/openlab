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
 * How soon after an interrupt another one is that same interrupt arriving again rather than the
 * operator pressing twice. Ctrl+C reaches a lab started through a script runner twice — once from
 * the terminal and once forwarded by the runner — and the two land within milliseconds of each
 * other, so anything this close together is one press.
 */
export const SAME_PRESS_WITHIN_MS = 1_000;

/**
 * How long the question stands before the lab goes back to running. A press nobody followed up on
 * was the wrong window or the wrong key, and one that comes minutes later starts the question over
 * rather than answering the one it has forgotten asking.
 */
export const CONFIRM_STOP_WITHIN_MS = 5_000;

/**
 * How long a stop may take before the operator is offered the way out of waiting for it. Never
 * sooner than a forwarded interrupt can land, or the offer would be taken by one.
 */
export const QUIT_OFFER_AFTER_MS = SAME_PRESS_WITHIN_MS;

/**
 * What a process interrupted on its way through something ends with: 128 plus the signal. An
 * operator who would not wait for the stop gets exactly that, because that is what happened.
 */
export const FORCED_STOP_EXIT_CODE = 130;
