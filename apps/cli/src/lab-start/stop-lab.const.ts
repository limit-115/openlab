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
