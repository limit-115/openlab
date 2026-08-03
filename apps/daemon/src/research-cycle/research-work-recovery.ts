import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { BranchProgress } from "@lab/protocol/branches/branch-progress.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";

export async function reconcileInterruptedWork(workspace: LabWorkspace): Promise<void> {
    const interruptedTaskIds: string[] = [];
    const interruptedExperimentIds: string[] = [];
    await workspace.update((draft) => {
        for (const task of draft.tasks) {
            if (
                task.status === InternalTaskStatus.RUNNING ||
                task.status === InternalTaskStatus.LEASED
            ) {
                task.status = InternalTaskStatus.CANCELLED;
                interruptedTaskIds.push(task.id);
            }
        }
        for (const experiment of draft.experiments) {
            if (experiment.status === ExperimentStatus.RUNNING) {
                experiment.status = ExperimentStatus.CANCELLED;
                experiment.finished_at = new Date().toISOString();
                interruptedExperimentIds.push(experiment.id);
            }
        }
        for (const agent of draft.agents) {
            if (agent.status === AgentStatus.WORKING) {
                agent.status = AgentStatus.STOPPED;
                delete agent.current_task_id;
            }
        }
        for (const branch of draft.branches) {
            if (branch.status === BranchStatus.ACTIVE) {
                branch.status = BranchStatus.PAUSED;
                branch.progress = BranchProgress.CANCELLED;
            }
        }
    });
    await Promise.all([
        ...interruptedTaskIds.map((taskId) =>
            workspace.appendEvent(EventType.TASK_CANCELLED, {
                task_id: taskId,
                recovered_interruption: true
            })
        ),
        ...interruptedExperimentIds.flatMap((experimentId) => [
            workspace.appendEvent(EventType.EXPERIMENT_CANCELLED, {
                experiment_id: experimentId,
                recovered_interruption: true
            }),
            workspace.appendEvent(EventType.ATTEMPT_CANCELLED, {
                attempt_id: experimentId,
                recovered_interruption: true
            })
        ])
    ]);
}

export async function cancelActiveWork(workspace: LabWorkspace): Promise<void> {
    const cancelledTaskIds: string[] = [];
    const cancelledExperimentIds: string[] = [];
    await workspace.update((draft) => {
        for (const task of draft.tasks) {
            if (
                task.status === InternalTaskStatus.RUNNING ||
                task.status === InternalTaskStatus.LEASED
            ) {
                task.status = InternalTaskStatus.CANCELLED;
                cancelledTaskIds.push(task.id);
            }
        }
        for (const experiment of draft.experiments) {
            if (experiment.status === ExperimentStatus.RUNNING) {
                experiment.status = ExperimentStatus.CANCELLED;
                experiment.finished_at = new Date().toISOString();
                cancelledExperimentIds.push(experiment.id);
            }
        }
        for (const agent of draft.agents) {
            if (agent.status === AgentStatus.WORKING) {
                agent.status = AgentStatus.STOPPED;
                delete agent.current_task_id;
            }
        }
        for (const branch of draft.branches) {
            if (branch.status === BranchStatus.ACTIVE) {
                branch.status = BranchStatus.PAUSED;
                branch.progress = BranchProgress.CANCELLED;
            }
        }
    });
    await Promise.all([
        ...cancelledTaskIds.map((taskId) =>
            workspace.appendEvent(EventType.TASK_CANCELLED, { task_id: taskId })
        ),
        ...cancelledExperimentIds.map((experimentId) =>
            workspace.appendEvent(EventType.EXPERIMENT_CANCELLED, {
                experiment_id: experimentId
            })
        )
    ]);
}
