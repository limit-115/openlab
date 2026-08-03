import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import {
    GOAL_REASON,
    GOAL_STATEMENT,
    MISSION,
    MISSION_META,
    OVERVIEW
} from "#src/mission-overview/mission-overview.const";
import { CycleRail } from "#src/research-cycle/cycle-rail";
import { formatDate } from "#src/value-display/timestamp-display";

interface MissionOverviewProps {
    snapshot: StatusSnapshot;
}

export function MissionOverview({ snapshot }: MissionOverviewProps) {
    const activeBranches = snapshot.branches.filter(
        (branch) => branch.status === BranchStatus.ACTIVE
    ).length;

    return (
        <section className={OVERVIEW} aria-labelledby="goal-heading">
            <div className={MISSION}>
                <h1 id="goal-heading" className={GOAL_STATEMENT}>
                    {snapshot.lab.goal}
                </h1>
                {snapshot.lab.reason ? <p className={GOAL_REASON}>{snapshot.lab.reason}</p> : null}
                <p className={MISSION_META}>
                    {snapshot.branches.length > 0 ? (
                        <span>
                            {activeBranches} of {snapshot.branches.length} directions active
                        </span>
                    ) : null}
                    <span>Updated {formatDate(snapshot.lab.updated_at)}</span>
                </p>
            </div>

            <CycleRail agents={snapshot.agents} />
        </section>
    );
}
