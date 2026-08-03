import { AgentActivityFrameKind } from "#src/agent-activity/agent-activity-frame.const";

/** What a running agent is doing right now, as the operator watching it would describe it. */
export const AgentActivityPhase = {
    STARTING: "starting",
    THINKING: "thinking",
    RESPONDING: "responding",
    USING_TOOL: "using_tool",
    FINISHED: "finished"
} as const;
export type AgentActivityPhase = (typeof AgentActivityPhase)[keyof typeof AgentActivityPhase];

/**
 * The named events the agent activity stream sends. A viewer is given the roster first and then the
 * frames, so both sides name them from here rather than repeating string literals at each end.
 */
export const AgentActivityStreamEvent = {
    ROSTER: "roster",
    ACTIVITY: "activity"
} as const;
export type AgentActivityStreamEvent =
    (typeof AgentActivityStreamEvent)[keyof typeof AgentActivityStreamEvent];

/**
 * What each frame says the agent is now doing. Diagnostics and usage report on work already
 * described by another frame, so they leave the phase where they found it.
 *
 * It belongs to the contract rather than to either end, because both ends derive the phase from the
 * same frames: the daemon as they are produced, a viewer as they are replayed from disk.
 */
export const AgentActivityPhaseByFrameKind: Record<
    AgentActivityFrameKind,
    AgentActivityPhase | null
> = {
    [AgentActivityFrameKind.RUN_STARTED]: AgentActivityPhase.STARTING,
    [AgentActivityFrameKind.THINKING]: AgentActivityPhase.THINKING,
    [AgentActivityFrameKind.MESSAGE]: AgentActivityPhase.RESPONDING,
    [AgentActivityFrameKind.TOOL]: AgentActivityPhase.USING_TOOL,
    [AgentActivityFrameKind.RUN_FINISHED]: AgentActivityPhase.FINISHED,
    [AgentActivityFrameKind.DIAGNOSTIC]: null,
    [AgentActivityFrameKind.USAGE]: null
};
