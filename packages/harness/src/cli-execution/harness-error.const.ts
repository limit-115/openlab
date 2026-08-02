export const HarnessErrorCodes = {
    SUBSCRIPTION_AUTH_REQUIRED: "subscription_auth_required",
    INVALID_REQUEST: "invalid_request",
    INVALID_EVENT_STREAM: "invalid_event_stream",
    ABORTED: "aborted",
    TIMED_OUT: "timed_out"
} as const;

export type HarnessErrorCode = (typeof HarnessErrorCodes)[keyof typeof HarnessErrorCodes];

export const HarnessTimeoutPhases = {
    PREFLIGHT: "preflight",
    RUN: "run"
} as const;

export type HarnessTimeoutPhase = (typeof HarnessTimeoutPhases)[keyof typeof HarnessTimeoutPhases];
