import type { AgentActivityPhase } from "@openlab/protocol/agent-activity/agent-activity.const";

export interface AgentLatestLine {
    /** The tool the agent called, when a tool is the more useful thing to say than the phase. */
    toolName: string | null;
    /** What the tool was called on, shown whole or not at all. */
    detail: string | null;
    phase: AgentActivityPhase;
}
