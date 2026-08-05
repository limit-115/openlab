import type { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import type { AgentRole } from "@openlab/protocol/agents/agent-role.const";

export interface StartAgentRunInput {
    readonly id: string;
    readonly role: AgentRole;
    /** Absent on a director run, which answers to the goal rather than to one bet. */
    readonly assumptionId?: string;
    readonly objective: string;
    readonly cwd: string;
}

export interface AgentRunFailure {
    readonly status:
        | typeof AgentRunStatus.FAILED
        | typeof AgentRunStatus.TIMED_OUT
        | typeof AgentRunStatus.CANCELLED;
    readonly error: string;
}
