export const AgentRole = {
    DIRECTOR: "director",
    RESEARCHER: "researcher",
    VERIFIER: "verifier"
} as const;
export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];
