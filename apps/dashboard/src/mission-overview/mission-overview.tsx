import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { LeadStatus } from "@openlab/protocol/leads/lead-status.const";
import { useTranslation } from "react-i18next";
import {
    GOAL_REASON,
    GOAL_STATEMENT,
    MISSION,
    MISSION_META,
    OVERVIEW
} from "#src/mission-overview/mission-overview.const";
import { MISSION_OVERVIEW_NAMESPACE } from "#src/mission-overview/mission-overview.i18n";
import { CycleRail } from "#src/research-cycle/cycle-rail";
import { formatDate } from "#src/value-display/timestamp-display";

interface MissionOverviewProps {
    snapshot: StatusSnapshot;
}

export function MissionOverview({ snapshot }: MissionOverviewProps) {
    const { t } = useTranslation(MISSION_OVERVIEW_NAMESPACE);
    const liveBets = snapshot.leads.filter(
        ({ status }) => status === LeadStatus.OPEN || status === LeadStatus.RESEARCHING
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
                    {snapshot.leads.length > 0 ? (
                        <span>
                            {t("leadsLive", {
                                live: liveBets,
                                count: snapshot.leads.length
                            })}
                        </span>
                    ) : null}
                    <span>
                        {t("updated", { at: formatDate(snapshot.investigation.updated_at) })}
                    </span>
                    {snapshot.investigation.resume_at === undefined ? null : (
                        <span>
                            {t("resumes", { at: formatDate(snapshot.investigation.resume_at) })}
                        </span>
                    )}
                </p>
            </div>

            <CycleRail runs={snapshot.runs} />
        </section>
    );
}
