import type { LabWorkspace } from "#src/workspace";

export async function bootstrapResearch(workspace: LabWorkspace): Promise<void> {
    const task = await workspace.getTask();
    await workspace.appendEvent("lab.started", {
        goal: task.goal,
        context_items: task.context.length,
        success_criteria: task.success_criteria.length
    });
    await workspace.appendEvent("task.queued", {
        task_id: "task-understand",
        branch_id: "branch-director"
    });
}
