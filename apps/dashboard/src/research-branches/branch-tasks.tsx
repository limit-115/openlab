import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import { CircleCheckIcon, CircleDashedIcon } from "lucide-react";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemGroup,
    ItemMedia,
    ItemTitle
} from "#src/design-system/item";
import { BRANCH_DETAIL_HEADING } from "#src/research-branches/branch-card.const";
import { StatusTag } from "#src/status-tag/status-tag";

interface BranchTasksProps {
    tasks: InternalTask[];
}

export function BranchTasks({ tasks }: BranchTasksProps) {
    return (
        <div>
            <h3 className={BRANCH_DETAIL_HEADING}>Tasks</h3>
            {tasks.length > 0 ? (
                <ItemGroup className="gap-2">
                    {tasks.map((task) => (
                        <Item key={task.id} asChild variant="muted" size="sm">
                            <li>
                                <ItemMedia variant="icon" className="text-muted-foreground">
                                    {task.status === InternalTaskStatus.SUCCEEDED ? (
                                        <CircleCheckIcon aria-hidden="true" />
                                    ) : (
                                        <CircleDashedIcon aria-hidden="true" />
                                    )}
                                </ItemMedia>
                                <ItemContent>
                                    <ItemTitle className="font-normal">{task.objective}</ItemTitle>
                                </ItemContent>
                                <ItemActions>
                                    <StatusTag status={task.status} />
                                </ItemActions>
                            </li>
                        </Item>
                    ))}
                </ItemGroup>
            ) : (
                <p className="text-sm text-muted-foreground">No tasks created</p>
            )}
        </div>
    );
}
