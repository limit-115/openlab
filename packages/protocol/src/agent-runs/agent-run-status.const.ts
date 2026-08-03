/**
 * How one agent's run ended, or that it is still going. `BLOCKED` is the only status the agent
 * itself chooses: it means the run stopped because a resource only the operator can hand over is
 * missing, not because the work failed.
 */
export const AgentRunStatus = {
    RUNNING: "running",
    SUCCEEDED: "succeeded",
    FAILED: "failed",
    TIMED_OUT: "timed_out",
    CANCELLED: "cancelled",
    BLOCKED: "blocked"
} as const;
export type AgentRunStatus = (typeof AgentRunStatus)[keyof typeof AgentRunStatus];
