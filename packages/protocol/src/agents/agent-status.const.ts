export const AgentStatus = {
    IDLE: "idle",
    WORKING: "working",
    BLOCKED: "blocked",
    STOPPED: "stopped"
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];
