import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
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
    const liveBets = snapshot.assumptions.filter(
        ({ status }) => status === AssumptionStatus.OPEN || status === AssumptionStatus.RESEARCHING
    ).length;

    return (
        <section className={OVERVIEW} aria-labelledby="goal-heading">
            <div className={MISSION}>
                <h1 id="goal-heading" className={GOAL_STATEMENT}>
                    {snapshot.investigation.goal}
                </h1>
                {snapshot.investigation.reason ? (
                    <p className={GOAL_REASON}>{snapshot.investigation.reason}</p>
                ) : null}
                <p className={MISSION_META}>
                    {snapshot.assumptions.length > 0 ? (
                        <span>
                            {liveBets} of {snapshot.assumptions.length} bets still live
                        </span>
                    ) : null}
                    <span>Updated {formatDate(snapshot.investigation.updated_at)}</span>
                </p>
            </div>

            <CycleRail runs={snapshot.runs} />
        </section>
    );
}
