import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";

export const AGENT_PRESENCE = "size-2 flex-none rounded-full" as const;

export const AGENT_PRESENCE_TONE: Record<AgentStatus, string> = {
    [AgentStatus.WORKING]: "bg-primary ring-4 ring-primary/20",
    [AgentStatus.BLOCKED]: "bg-destructive",
    [AgentStatus.IDLE]: "bg-muted-foreground",
    [AgentStatus.STOPPED]: "bg-border"
};

export const AGENT_STATUS = "text-sm text-muted-foreground" as const;

export const AGENT_HARNESS_LABEL: Record<AgentHarnessKind, string> = {
    [AgentHarnessKind.CODEX]: "Codex",
    [AgentHarnessKind.CLAUDE]: "Claude",
    [AgentHarnessKind.GLM]: "GLM"
};

/** Shown until the agent's first harness run starts and reports what it runs on. */
export const AGENT_EXECUTION_PENDING = "Harness not assigned yet" as const;
