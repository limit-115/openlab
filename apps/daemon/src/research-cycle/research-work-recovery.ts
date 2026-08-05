import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";

/**
 * A run recorded as running belongs to a process that no longer exists, whether the daemon crashed
 * or the operator stopped it. Its agent is gone either way, so the record is closed as cancelled
 * rather than left claiming work that nothing is doing.
 */
export async function cancelActiveWork(workspace: InvestigationWorkspace): Promise<void> {
    await closeRunningWork(workspace, {});
}

export async function reconcileInterruptedWork(workspace: InvestigationWorkspace): Promise<void> {
    await closeRunningWork(workspace, { recovered_interruption: true });
}

async function closeRunningWork(
    workspace: InvestigationWorkspace,
    payload: Readonly<Record<string, unknown>>
): Promise<void> {
    const cancelledRunIds: string[] = [];
    await workspace.update((draft) => {
        for (const run of draft.runs) {
            if (run.status === AgentRunStatus.RUNNING) {
                run.status = AgentRunStatus.CANCELLED;
                run.finished_at = new Date().toISOString();
                cancelledRunIds.push(run.id);
            }
        }
    });
    await Promise.all(
        cancelledRunIds.map((runId) =>
            workspace.appendEvent(EventType.RUN_CANCELLED, { run_id: runId, ...payload })
        )
    );
}
