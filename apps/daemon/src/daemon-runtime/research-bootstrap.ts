import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";

export async function bootstrapResearch(workspace: InvestigationWorkspace): Promise<void> {
    const task = await workspace.getTask();
    await workspace.appendEvent(
        workspace.recovered ? EventType.INVESTIGATION_RECOVERED : EventType.INVESTIGATION_STARTED,
        {
            goal: task.goal,
            context_items: task.context.length,
            success_criteria: task.success_criteria.length
        }
    );
}
