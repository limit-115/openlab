import type { AgentSummary } from "@lab/protocol/agents/agent-summary.types";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import type { BranchSummary } from "@lab/protocol/branches/branch-summary.types";
import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import { BotIcon, CircleCheckIcon, ListTodoIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import {
    BRANCH_CARD,
    BRANCH_CARD_APPROACH,
    BRANCH_CARD_COUNTS,
    BRANCH_CARD_META,
    BRANCH_CARD_STATUS,
    BRANCH_CARD_STATUS_TONE,
    BRANCH_CARD_SUMMARY,
    BRANCH_CARD_TITLE,
    BRANCH_PROGRESS
} from "#src/research-branches/branch-card.const";
import { branchProgressTone } from "#src/research-branches/branch-progress-tone";

interface BranchCardProps {
    branch: BranchSummary;
    agents: AgentSummary[];
    tasks: InternalTask[];
}

/**
 * A direction and how far it has got. Who is working on it and what they are writing belongs to the
 * team view, where an agent is shown once instead of once per branch it happens to sit under.
 */
export function BranchCard({ branch, agents, tasks }: BranchCardProps) {
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
        <li className={BRANCH_CARD}>
            <div className={BRANCH_CARD_SUMMARY}>
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
                    <span className={BRANCH_CARD_COUNTS}>
                        <Badge variant="outline">
                            <BotIcon aria-hidden="true" /> {agents.length}
                        </Badge>
                        <Badge variant="outline">
                            <ListTodoIcon aria-hidden="true" /> {runningTasks}/{tasks.length}
                        </Badge>
                    </span>
                    {branch.progress ? (
                        <Badge
                            variant={branchProgressTone(branch.progress)}
                            className={BRANCH_PROGRESS}
                        >
                            {branch.progress}
                        </Badge>
                    ) : null}
                </span>
            </div>
        </li>
    );
}
