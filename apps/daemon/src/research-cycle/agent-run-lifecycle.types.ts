import type { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import type { AgentRole } from "@openlab/protocol/agents/agent-role.const";

export interface StartAgentRunInput {
    readonly id: string;
    readonly role: AgentRole;
    /** Absent on a director run, which answers to the goal rather than to one lead. */
    readonly leadId?: string;
    readonly objective: string;
    readonly cwd: string;
}

/**
 * What a finished run leaves the lab holding of it. The manifest names every artifact with its
 * digest; the manifest's own digest is kept here, where the run directory cannot restate it.
 */
export interface AgentRunOutcome {
    readonly exitCode?: number | null;
    readonly manifestPath?: string;
    readonly manifestSha256?: string;
}

export interface AgentRunFailure {
    readonly status:
        | typeof AgentRunStatus.FAILED
        | typeof AgentRunStatus.TIMED_OUT
        | typeof AgentRunStatus.CANCELLED;
    readonly error: string;
}
