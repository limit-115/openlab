import { AgentRole } from "@lab/protocol/agents/agent-role.const";

/**
 * The order a research cycle runs its roles in. A cycle plans, then researches in parallel, then
 * attacks its own results, then reproduces them, so reading the rail left to right is reading how
 * far the current cycle has got.
 */
export const CYCLE_STAGES = [
    AgentRole.DIRECTOR,
    AgentRole.RESEARCHER,
    AgentRole.CRITIC,
    AgentRole.VERIFIER
] as const;

/** How a stage of the cycle is going, which is what the rail colours each stage by. */
export const CycleStageState = {
    /** No agent has taken this stage of the cycle yet. */
    PENDING: "pending",
    /** At least one agent is working on it right now. */
    ACTIVE: "active",
    /** An agent reached it but cannot proceed without something it does not have. */
    BLOCKED: "blocked",
    /** Every agent that took it has stopped, so the cycle has moved past it. */
    DONE: "done"
} as const;
export type CycleStageState = (typeof CycleStageState)[keyof typeof CycleStageState];

export const CYCLE_STAGE_LABEL: Record<(typeof CYCLE_STAGES)[number], string> = {
    [AgentRole.DIRECTOR]: "Director",
    [AgentRole.RESEARCHER]: "Researchers",
    [AgentRole.CRITIC]: "Critic",
    [AgentRole.VERIFIER]: "Verifier"
};

/** What a stage says about itself when no agent has reached it. */
export const STAGE_NOT_REACHED = "Not reached yet" as const;
