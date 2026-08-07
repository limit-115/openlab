export const HarnessErrorCodes = {
    CAPABILITY_REQUIRED: "capability_required",
    INVALID_REQUEST: "invalid_request",
    INVALID_EVENT_STREAM: "invalid_event_stream",
    ABORTED: "aborted",
    TIMED_OUT: "timed_out"
} as const;

export type HarnessErrorCode = (typeof HarnessErrorCodes)[keyof typeof HarnessErrorCodes];

/**
 * What a harness turned out not to have. The three are different jobs for whoever has to fix it —
 * install the CLI, give it a credential it can spend, or wait for the allowance — and only the code
 * that found the gap can tell them apart, so it says so here rather than leaving a reader to guess
 * from a message.
 *
 * `CREDENTIAL` covers all five harnesses rather than the three that hold a subscription: DeepSeek is
 * handed an API key and Muse Code logs in to a Meta account, and both raise this same gap. Naming it
 * after a subscription would make the readiness state it maps to, `NOT_SIGNED_IN`, disagree with the
 * reason it was set.
 */
export const HarnessCapabilityGaps = {
    INSTALLATION: "installation",
    CREDENTIAL: "credential",
    ALLOWANCE: "allowance"
} as const;

export type HarnessCapabilityGap =
    (typeof HarnessCapabilityGaps)[keyof typeof HarnessCapabilityGaps];

export const HarnessTimeoutPhases = {
    PREFLIGHT: "preflight",
    RUN: "run"
} as const;

export type HarnessTimeoutPhase = (typeof HarnessTimeoutPhases)[keyof typeof HarnessTimeoutPhases];
