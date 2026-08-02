export const HarnessEventTypes = {
    SESSION_STARTED: "session_started",
    ASSISTANT_DELTA: "assistant_delta",
    ASSISTANT_COMPLETED: "assistant_completed",
    REASONING_DELTA: "reasoning_delta",
    REASONING_COMPLETED: "reasoning_completed",
    TOOL: "tool",
    STRUCTURED_OUTPUT: "structured_output",
    USAGE: "usage",
    DIAGNOSTIC: "diagnostic",
    NATIVE: "native",
    RUN_COMPLETED: "run_completed"
} as const;

export const HarnessToolPhases = {
    STARTED: "started",
    UPDATED: "updated",
    COMPLETED: "completed"
} as const;

export type HarnessToolPhase = (typeof HarnessToolPhases)[keyof typeof HarnessToolPhases];

export const HarnessDiagnosticLevels = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
} as const;

export type HarnessDiagnosticLevel =
    (typeof HarnessDiagnosticLevels)[keyof typeof HarnessDiagnosticLevels];

export const HarnessNativeEventTypes = {
    UNKNOWN: "unknown"
} as const;
