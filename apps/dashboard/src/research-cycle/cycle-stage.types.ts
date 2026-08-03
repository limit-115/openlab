import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import type { CycleStageState } from "#src/research-cycle/cycle-stage.const";

export interface CycleStage {
    role: AgentRole;
    label: string;
    state: CycleStageState;
    /** What the agents on this stage are doing, counted rather than guessed at. */
    note: string;
}
