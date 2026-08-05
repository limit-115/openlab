import type { AgentRun } from "@openlab/protocol/agent-runs/agent-run.types";
import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { CYCLE_STAGES, CycleStageState } from "#src/research-cycle/cycle-stage.const";
import type { CycleStage } from "#src/research-cycle/cycle-stage.types";

/**
 * Reads the cycle off the runs themselves. Nothing in the snapshot names a stage, but the roles run
 * in a fixed order, so which roles are running and which have ended is the same information.
 */
export function cycleStages(runs: AgentRun[]): CycleStage[] {
    return CYCLE_STAGES.map((role) => {
        const onStage = runs.filter((run) => run.role === role);
        const running = countStatus(onStage, AgentRunStatus.RUNNING);
        const blocked = countStatus(onStage, AgentRunStatus.BLOCKED);
        const succeeded = countStatus(onStage, AgentRunStatus.SUCCEEDED);
        const ended = onStage.length - running - blocked - succeeded;

        return {
            role,
            state: stageState(onStage.length, running, blocked),
            counts: { running, blocked, succeeded, ended }
        };
    });
}

function countStatus(runs: AgentRun[], status: AgentRunStatus): number {
    return runs.filter((run) => run.status === status).length;
}

function stageState(total: number, running: number, blocked: number): CycleStageState {
    if (total === 0) {
        return CycleStageState.PENDING;
    }
    if (blocked > 0) {
        return CycleStageState.BLOCKED;
    }
    if (running > 0) {
        return CycleStageState.ACTIVE;
    }
    return CycleStageState.DONE;
}
