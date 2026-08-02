import type { StatusSnapshot } from "@lab/protocol/status";
import { and, eq, notInArray } from "drizzle-orm";
import { tasks } from "#src/lab-database/lab-schema";
import { AgentRoleSchedulerLane } from "#src/runtime/snapshot-projection/agent-role-scheduler-lane.const";
import { assertUpserted } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";
import { TaskProjectionDefault } from "#src/runtime/snapshot-projection/task-projection.const";

export async function upsertTasks(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    for (const task of snapshot.tasks) {
        const records = await database
            .insert(tasks)
            .values({
                id: task.id,
                labId: snapshot.lab.id,
                branchId: task.branch_id,
                objective: task.objective,
                contextRefs: task.context_refs,
                status: task.status,
                role: task.role,
                lane: AgentRoleSchedulerLane[task.role],
                priority: TaskProjectionDefault.PRIORITY,
                attempt: task.attempt,
                availableAt: projectionAt,
                createdAt: projectionAt,
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: tasks.id,
                set: {
                    branchId: task.branch_id,
                    objective: task.objective,
                    contextRefs: task.context_refs,
                    status: task.status,
                    role: task.role,
                    lane: AgentRoleSchedulerLane[task.role],
                    attempt: task.attempt,
                    updatedAt: projectionAt
                },
                setWhere: eq(tasks.labId, snapshot.lab.id)
            })
            .returning({ id: tasks.id });
        assertUpserted(records, "task", task.id);
    }
}

export async function deleteMissingTasks(
    database: RuntimeProjectionDatabase,
    labId: string,
    ids: string[]
): Promise<void> {
    await database
        .delete(tasks)
        .where(
            ids.length === 0
                ? eq(tasks.labId, labId)
                : and(eq(tasks.labId, labId), notInArray(tasks.id, ids))
        );
}
