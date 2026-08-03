import { EventType } from "@lab/protocol/lab-events/event-type.const";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";

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
}
