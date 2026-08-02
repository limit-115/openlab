/** What a running agent is doing right now, as the operator watching it would describe it. */
export const AgentActivityPhase = {
    STARTING: "starting",
    THINKING: "thinking",
    RESPONDING: "responding",
    USING_TOOL: "using_tool",
    FINISHED: "finished"
} as const;
export type AgentActivityPhase = (typeof AgentActivityPhase)[keyof typeof AgentActivityPhase];

/**
 * The named events the agent activity stream sends. A viewer is given the roster first and then the
 * frames, so both sides name them from here rather than repeating string literals at each end.
 */
export const AgentActivityStreamEvent = {
    ROSTER: "roster",
    ACTIVITY: "activity"
} as const;
export type AgentActivityStreamEvent =
    (typeof AgentActivityStreamEvent)[keyof typeof AgentActivityStreamEvent];

/**
 * How an agent's harness run ended, or that it has not ended yet. The harness package owns its own
 * run statuses and never depends on this contract, so the daemon translates between the two.
 */
export const AgentRunStatus = {
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    TIMED_OUT: "timed_out",
    CANCELLED: "cancelled"
} as const;
export type AgentRunStatus = (typeof AgentRunStatus)[keyof typeof AgentRunStatus];
