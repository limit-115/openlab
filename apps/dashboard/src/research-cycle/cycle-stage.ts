import type { AgentRun } from "@lab/protocol/agent-runs/agent-run.types";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import {
    CYCLE_STAGE_LABEL,
    CYCLE_STAGES,
    CycleStageState,
    STAGE_NOT_REACHED
} from "#src/research-cycle/cycle-stage.const";
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
            label: CYCLE_STAGE_LABEL[role],
            state: stageState(onStage.length, running, blocked),
            note: stageNote(onStage.length, { running, blocked, succeeded, ended })
        };
    });
}

interface StageCounts {
    readonly running: number;
    readonly blocked: number;
    readonly succeeded: number;
    /** Runs that failed, timed out or were cancelled, which read the same on the rail. */
    readonly ended: number;
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

function stageNote(total: number, counts: StageCounts): string {
    if (total === 0) {
        return STAGE_NOT_REACHED;
    }

    const parts = [
        counts.running > 0 ? `${counts.running} working` : undefined,
        counts.blocked > 0 ? `${counts.blocked} blocked` : undefined,
        counts.succeeded > 0 ? `${counts.succeeded} finished` : undefined,
        counts.ended > 0 ? `${counts.ended} stopped` : undefined
    ].filter((part) => part !== undefined);

    return parts.join(" · ");
}
