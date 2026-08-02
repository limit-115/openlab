import { AgentStatus } from "@lab/protocol/agents/agent-status.const";

export const AGENT_LIST = "grid gap-[5px]" as const;

export const AGENT_ROW =
    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[7px] bg-surface-soft px-2 py-[7px]" as const;

export const AGENT_PRESENCE = "h-[6px] w-[6px] rounded-full" as const;

export const AGENT_PRESENCE_TONE: Record<AgentStatus, string> = {
    [AgentStatus.WORKING]: "bg-green shadow-[0_0_7px_rgba(96,211,148,0.55)]",
    [AgentStatus.BLOCKED]: "bg-red",
    [AgentStatus.IDLE]: "bg-amber",
    [AgentStatus.STOPPED]: "bg-fg-faint"
};

export const AGENT_ROLE = "text-[10px] font-[650] capitalize" as const;

export const AGENT_TASK =
    "mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-fg-faint" as const;

export const AGENT_STATUS = "text-[8px] uppercase text-fg-faint" as const;
