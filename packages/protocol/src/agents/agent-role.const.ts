export const AgentRole = {
    DIRECTOR: "director",
    RESEARCHER: "researcher",
    CRITIC: "critic",
    VERIFIER: "verifier"
} as const;
export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];
