import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import {
    CircleDotIcon,
    GitBranchIcon,
    ListChecksIcon,
    MicroscopeIcon,
    TargetIcon
} from "lucide-react";
import {
    GOAL_REASON,
    GOAL_STATEMENT,
    METRIC_GRID,
    OVERVIEW
} from "#src/mission-overview/mission-overview.const";
import { ResearchMetric } from "#src/mission-overview/research-metric";
import { Panel } from "#src/panel/panel";
import { formatDate } from "#src/value-display/timestamp-display";

interface MissionOverviewProps {
    snapshot: StatusSnapshot;
}

export function MissionOverview({ snapshot }: MissionOverviewProps) {
    const activeBranches = snapshot.branches.filter(
        (branch) => branch.status === BranchStatus.ACTIVE
    ).length;
    const activeTasks = snapshot.tasks.filter(
        (task) =>
            task.status === InternalTaskStatus.QUEUED ||
            task.status === InternalTaskStatus.LEASED ||
            task.status === InternalTaskStatus.RUNNING
    ).length;
    const supportedClaims = snapshot.claims.filter(
        (claim) => claim.status === ClaimStatus.SUPPORTED || claim.status === ClaimStatus.REPRODUCED
    ).length;
    const runningExperiments = snapshot.experiments.filter(
        (experiment) => experiment.status === ExperimentStatus.RUNNING
    ).length;

    return (
        <section className={OVERVIEW} aria-labelledby="goal-heading">
            <Panel
                title="Mission goal"
                description="Active objective"
                icon={TargetIcon}
                action={
                    <span className="text-sm whitespace-nowrap text-muted-foreground">
                        Updated {formatDate(snapshot.lab.updated_at)}
                    </span>
                }
            >
                <h1 id="goal-heading" className={GOAL_STATEMENT}>
                    {snapshot.lab.goal}
                </h1>
                {snapshot.lab.reason ? <p className={GOAL_REASON}>{snapshot.lab.reason}</p> : null}
            </Panel>

            <ul className={METRIC_GRID} aria-label="Research metrics">
                <ResearchMetric
                    icon={GitBranchIcon}
                    label="Active branches"
                    value={activeBranches}
                    total={snapshot.branches.length}
                />
                <ResearchMetric
                    icon={ListChecksIcon}
                    label="Open tasks"
                    value={activeTasks}
                    total={snapshot.tasks.length}
                />
                <ResearchMetric
                    icon={CircleDotIcon}
                    label="Strong claims"
                    value={supportedClaims}
                    total={snapshot.claims.length}
                />
                <ResearchMetric
                    icon={MicroscopeIcon}
                    label="Experiments live"
                    value={runningExperiments}
                    total={snapshot.experiments.length}
                />
            </ul>
        </section>
    );
}
