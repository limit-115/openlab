import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import type { CycleStageState } from "#src/research-cycle/cycle-stage.const";

/** What the agents on one stage are doing, counted rather than guessed at. */
export interface StageCounts {
    readonly running: number;
    readonly blocked: number;
    readonly succeeded: number;
    /** Runs that failed, timed out or were cancelled, which read the same on the rail. */
    readonly ended: number;
}

export interface CycleStage {
    role: AgentRole;
    state: CycleStageState;
    counts: StageCounts;
}
