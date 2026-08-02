/** One thing that happened inside a running agent. */
export const AgentActivityFrameKind = {
    RUN_STARTED: "run_started",
    THINKING: "thinking",
    MESSAGE: "message",
    TOOL: "tool",
    DIAGNOSTIC: "diagnostic",
    USAGE: "usage",
    RUN_FINISHED: "run_finished"
} as const;
export type AgentActivityFrameKind =
    (typeof AgentActivityFrameKind)[keyof typeof AgentActivityFrameKind];

/** Where a tool call is in its lifecycle. */
export const AgentToolPhase = {
    STARTED: "started",
    UPDATED: "updated",
    COMPLETED: "completed"
} as const;
export type AgentToolPhase = (typeof AgentToolPhase)[keyof typeof AgentToolPhase];

export const AgentDiagnosticLevel = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
} as const;
export type AgentDiagnosticLevel = (typeof AgentDiagnosticLevel)[keyof typeof AgentDiagnosticLevel];
