import type { AgentSummary } from "@lab/protocol/agents/agent-summary.types";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import type { BranchSummary } from "@lab/protocol/branches/branch-summary.types";
import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import {
    BotIcon,
    ChevronDownIcon,
    CircleCheckIcon,
    ListTodoIcon,
    PauseIcon,
    PlayIcon
} from "lucide-react";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "#src/design-system/collapsible";
import { BranchAgents } from "#src/research-branches/branch-agents";
import {
    BRANCH_CARD,
    BRANCH_CARD_APPROACH,
    BRANCH_CARD_CHEVRON,
    BRANCH_CARD_CONTENT,
    BRANCH_CARD_META,
    BRANCH_CARD_STATUS,
    BRANCH_CARD_STATUS_TONE,
    BRANCH_CARD_SUMMARY,
    BRANCH_CARD_TITLE,
    BRANCH_DETAIL_GRID,
    BRANCH_PROGRESS
} from "#src/research-branches/branch-card.const";
import { BranchTasks } from "#src/research-branches/branch-tasks";

interface BranchCardProps {
    branch: BranchSummary;
    agents: AgentSummary[];
    tasks: InternalTask[];
    initiallyOpen: boolean;
}

export function BranchCard({ branch, agents, tasks, initiallyOpen }: BranchCardProps) {
    const runningTasks = tasks.filter(
        (task) =>
            task.status === InternalTaskStatus.LEASED || task.status === InternalTaskStatus.RUNNING
    ).length;
    const StatusIcon =
        branch.status === BranchStatus.ACTIVE
            ? PlayIcon
            : branch.status === BranchStatus.PAUSED
              ? PauseIcon
              : CircleCheckIcon;

    return (
        <Collapsible asChild defaultOpen={initiallyOpen}>
            <li className={BRANCH_CARD}>
                <CollapsibleTrigger className={BRANCH_CARD_SUMMARY}>
                    <span
                        className={cn(BRANCH_CARD_STATUS, BRANCH_CARD_STATUS_TONE[branch.status])}
                        aria-hidden="true"
                    >
                        <StatusIcon className="size-3.5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <strong className={BRANCH_CARD_TITLE}>{branch.title}</strong>
                        <span className={BRANCH_CARD_APPROACH}>{branch.approach}</span>
                    </span>
                    <span className={BRANCH_CARD_META}>
                        <Badge variant="outline">
                            <BotIcon aria-hidden="true" /> {agents.length}
                        </Badge>
                        <Badge variant="outline">
                            <ListTodoIcon aria-hidden="true" /> {runningTasks}/{tasks.length}
                        </Badge>
                    </span>
                    <ChevronDownIcon className={BRANCH_CARD_CHEVRON} aria-hidden="true" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className={BRANCH_CARD_CONTENT}>
                        {branch.progress ? (
                            <p className={BRANCH_PROGRESS}>{branch.progress}</p>
                        ) : null}
                        <div className={BRANCH_DETAIL_GRID}>
                            <BranchAgents agents={agents} tasks={tasks} />
                            <BranchTasks tasks={tasks} />
                        </div>
                    </div>
                </CollapsibleContent>
            </li>
        </Collapsible>
    );
}
