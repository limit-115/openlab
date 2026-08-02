import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import { CircleCheck, CircleDashed } from "lucide-react";
import { QUIET_NOTE } from "#src/panel/panel-empty-state.const";
import { BRANCH_DETAIL_HEADING } from "#src/research-branches/branch-card.const";
import { TASK_LIST, TASK_OBJECTIVE, TASK_ROW } from "#src/research-branches/branch-tasks.const";
import { StatusTag } from "#src/status-tag/status-tag";

interface BranchTasksProps {
    tasks: InternalTask[];
}

export function BranchTasks({ tasks }: BranchTasksProps) {
    return (
        <div>
            <h3 className={BRANCH_DETAIL_HEADING}>Tasks</h3>
            {tasks.length > 0 ? (
                <ul className={TASK_LIST}>
                    {tasks.map((task) => (
                        <li key={task.id} className={TASK_ROW}>
                            {task.status === InternalTaskStatus.SUCCEEDED ? (
                                <CircleCheck size={14} aria-hidden="true" />
                            ) : (
                                <CircleDashed size={14} aria-hidden="true" />
                            )}
                            <span className={TASK_OBJECTIVE}>{task.objective}</span>
                            <StatusTag status={task.status} />
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={QUIET_NOTE}>No tasks created</p>
            )}
        </div>
    );
}
