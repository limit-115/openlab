import { EventType } from "@lab/protocol/constants";
import type { LabWorkspace } from "#src/workspace";

export async function bootstrapResearch(workspace: LabWorkspace): Promise<void> {
    const task = await workspace.getTask();
    await workspace.appendEvent(
        workspace.recovered ? EventType.LAB_RECOVERED : EventType.LAB_STARTED,
        {
            goal: task.goal,
            context_items: task.context.length,
            success_criteria: task.success_criteria.length
        }
    );
    await workspace.appendEvent(EventType.TASK_QUEUED, {
        task_id: "task-understand",
        branch_id: "branch-director"
    });
}
