import { BranchStatus, InternalTaskStatus } from "@lab/protocol/constants";
import type { InternalTask } from "@lab/protocol/schemas";
import type { AgentSummary, BranchSummary } from "@lab/protocol/status";
import { Bot, ChevronDown, CircleCheck, ListTodo, Pause, Play } from "lucide-react";
import { BranchAgents } from "#src/research-branches/branch-agents";
import {
    BRANCH_CARD,
    BRANCH_CARD_APPROACH,
    BRANCH_CARD_CHEVRON,
    BRANCH_CARD_CONTENT,
    BRANCH_CARD_HEADING,
    BRANCH_CARD_META,
    BRANCH_CARD_META_ITEM,
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
            ? Play
            : branch.status === BranchStatus.PAUSED
              ? Pause
              : CircleCheck;

    return (
        <details className={BRANCH_CARD} open={initiallyOpen}>
            <summary className={BRANCH_CARD_SUMMARY}>
                <span className={`${BRANCH_CARD_STATUS} ${BRANCH_CARD_STATUS_TONE[branch.status]}`}>
                    <StatusIcon size={13} fill="currentColor" aria-hidden="true" />
                </span>
                <span className={BRANCH_CARD_HEADING}>
                    <strong className={BRANCH_CARD_TITLE}>{branch.title}</strong>
                    <span className={BRANCH_CARD_APPROACH}>{branch.approach}</span>
                </span>
                <span className={BRANCH_CARD_META}>
                    <span className={BRANCH_CARD_META_ITEM}>
                        <Bot size={13} aria-hidden="true" /> {agents.length}
                    </span>
                    <span className={BRANCH_CARD_META_ITEM}>
                        <ListTodo size={13} aria-hidden="true" /> {runningTasks}/{tasks.length}
                    </span>
                </span>
                <ChevronDown className={BRANCH_CARD_CHEVRON} size={16} aria-hidden="true" />
            </summary>
            <div className={BRANCH_CARD_CONTENT}>
                {branch.progress ? <p className={BRANCH_PROGRESS}>{branch.progress}</p> : null}
                <div className={BRANCH_DETAIL_GRID}>
                    <BranchAgents agents={agents} tasks={tasks} />
                    <BranchTasks tasks={tasks} />
                </div>
            </div>
        </details>
    );
}
