import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { TargetIcon } from "lucide-react";
import {
    GOAL_REASON,
    GOAL_STATEMENT,
    OVERVIEW
} from "#src/mission-overview/mission-overview.const";
import { Panel } from "#src/panel/panel";
import { CycleRail } from "#src/research-cycle/cycle-rail";
import { formatDate } from "#src/value-display/timestamp-display";

interface MissionOverviewProps {
    snapshot: StatusSnapshot;
}

export function MissionOverview({ snapshot }: MissionOverviewProps) {
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

            <CycleRail agents={snapshot.agents} />
        </section>
    );
}
