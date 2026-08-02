/** The subscription CLI harness an agent runs through. */
export const AgentHarnessKind = {
    CODEX: "codex",
    CLAUDE: "claude"
} as const;
export type AgentHarnessKind = (typeof AgentHarnessKind)[keyof typeof AgentHarnessKind];

/** The reasoning effort the harness session runs at. */
export const AgentEffortLevel = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    XHIGH: "xhigh",
    MAX: "max"
} as const;
export type AgentEffortLevel = (typeof AgentEffortLevel)[keyof typeof AgentEffortLevel];
