import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import type { AgentSummary } from "@lab/protocol/agents/agent-summary.types";
import {
    CYCLE_STAGE_LABEL,
    CYCLE_STAGES,
    CycleStageState,
    STAGE_NOT_REACHED
} from "#src/research-cycle/cycle-stage.const";
import type { CycleStage } from "#src/research-cycle/cycle-stage.types";

/**
 * Reads the cycle off the agents themselves. Nothing in the snapshot names a stage, but the roles
 * run in a fixed order, so which roles are working and which have stopped is the same information.
 */
export function cycleStages(agents: AgentSummary[]): CycleStage[] {
    return CYCLE_STAGES.map((role) => {
        const onStage = agents.filter((agent) => agent.role === role);
        const counts = {
            [AgentStatus.WORKING]: countStatus(onStage, AgentStatus.WORKING),
            [AgentStatus.BLOCKED]: countStatus(onStage, AgentStatus.BLOCKED),
            [AgentStatus.IDLE]: countStatus(onStage, AgentStatus.IDLE),
            [AgentStatus.STOPPED]: countStatus(onStage, AgentStatus.STOPPED)
        };

        return {
            role,
            label: CYCLE_STAGE_LABEL[role],
            state: stageState(onStage.length, counts),
            note: stageNote(onStage.length, counts)
        };
    });
}

type StatusCounts = Record<AgentStatus, number>;

function countStatus(agents: AgentSummary[], status: AgentStatus): number {
    return agents.filter((agent) => agent.status === status).length;
}

function stageState(total: number, counts: StatusCounts): CycleStageState {
    if (total === 0) {
        return CycleStageState.PENDING;
    }
    if (counts[AgentStatus.BLOCKED] > 0) {
        return CycleStageState.BLOCKED;
    }
    if (counts[AgentStatus.WORKING] > 0) {
        return CycleStageState.ACTIVE;
    }
    if (counts[AgentStatus.IDLE] > 0) {
        return CycleStageState.PENDING;
    }
    return CycleStageState.DONE;
}

function stageNote(total: number, counts: StatusCounts): string {
    if (total === 0) {
        return STAGE_NOT_REACHED;
    }

    const parts = [
        counts[AgentStatus.WORKING] > 0 ? `${counts[AgentStatus.WORKING]} working` : undefined,
        counts[AgentStatus.BLOCKED] > 0 ? `${counts[AgentStatus.BLOCKED]} blocked` : undefined,
        counts[AgentStatus.IDLE] > 0 ? `${counts[AgentStatus.IDLE]} waiting` : undefined,
        counts[AgentStatus.STOPPED] > 0 ? `${counts[AgentStatus.STOPPED]} finished` : undefined
    ].filter((part) => part !== undefined);

    return parts.join(" · ");
}
