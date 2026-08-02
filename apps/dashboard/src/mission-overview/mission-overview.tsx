import {
    BranchStatus,
    ClaimStatus,
    ExperimentStatus,
    InternalTaskStatus
} from "@lab/protocol/constants";
import type { StatusSnapshot } from "@lab/protocol/status";
import { CircleDot, GitBranch, ListChecks, Microscope, Target } from "lucide-react";
import {
    GOAL_PANEL_BODY,
    GOAL_PANEL_SURFACE,
    GOAL_REASON,
    GOAL_STATEMENT,
    METRIC_GRID,
    OVERVIEW
} from "#src/mission-overview/mission-overview.const";
import { ResearchMetric } from "#src/mission-overview/research-metric";
import { MetricTone } from "#src/mission-overview/research-metric.const";
import { Panel } from "#src/panel/panel";
import { PANEL_UPDATED_AT } from "#src/panel/panel.const";
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
                eyebrow="Active objective"
                icon={Target}
                surface={GOAL_PANEL_SURFACE}
                body={GOAL_PANEL_BODY}
                action={
                    <span className={PANEL_UPDATED_AT}>
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
                    icon={GitBranch}
                    label="Active branches"
                    value={activeBranches}
                    total={snapshot.branches.length}
                    tone={MetricTone.CYAN}
                />
                <ResearchMetric
                    icon={ListChecks}
                    label="Open tasks"
                    value={activeTasks}
                    total={snapshot.tasks.length}
                    tone={MetricTone.VIOLET}
                />
                <ResearchMetric
                    icon={CircleDot}
                    label="Strong claims"
                    value={supportedClaims}
                    total={snapshot.claims.length}
                    tone={MetricTone.GREEN}
                />
                <ResearchMetric
                    icon={Microscope}
                    label="Experiments live"
                    value={runningExperiments}
                    total={snapshot.experiments.length}
                    tone={MetricTone.AMBER}
                />
            </ul>
        </section>
    );
}
