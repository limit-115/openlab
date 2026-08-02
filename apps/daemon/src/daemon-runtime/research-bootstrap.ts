import { EventType } from "@lab/protocol/constants";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { initialResearchIdentifiers } from "#src/research-cycle/research-identifiers";

export async function bootstrapResearch(workspace: LabWorkspace): Promise<void> {
    const task = await workspace.getTask();
    const initialIds = initialResearchIdentifiers(workspace.labId);
    await workspace.appendEvent(
        workspace.recovered ? EventType.LAB_RECOVERED : EventType.LAB_STARTED,
        {
            goal: task.goal,
            context_items: task.context.length,
            success_criteria: task.success_criteria.length
        }
    );
    await workspace.appendEvent(EventType.TASK_QUEUED, {
        task_id: initialIds.taskId,
        branch_id: initialIds.branchId
    });
}
