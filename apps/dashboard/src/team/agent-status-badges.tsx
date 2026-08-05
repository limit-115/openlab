import type { AgentActivityPhase } from "@nightlab/protocol/agent-activity/agent-activity.const";
import type { AgentRunStatus } from "@nightlab/protocol/agent-runs/agent-run-status.const";
import { useTranslation } from "react-i18next";
import { Badge } from "#src/design-system/badge";
import { STATUS_TAG_NAMESPACE } from "#src/status-tag/status-tag.i18n";
import { TEAM_NAMESPACE } from "#src/team/team.i18n";
import { AGENT_STATUS_GROUP, PHASE_TONE, RUN_STATUS_TONE } from "#src/team/team-panel.const";

interface AgentStatusBadgesProps {
    phase: AgentActivityPhase;
    status: AgentRunStatus;
}

/**
 * What the agent is doing and how its run is going, as the same pair of badges wherever an agent
 * appears. A span rather than a div, because a roster entry is a button and carries these too.
 */
export function AgentStatusBadges({ phase, status }: AgentStatusBadgesProps) {
    const { t } = useTranslation(TEAM_NAMESPACE);
    // The status a run settles in is the dashboard's own vocabulary, not the team panel's.
    const { t: runStatus } = useTranslation(STATUS_TAG_NAMESPACE);

    return (
        <span className={AGENT_STATUS_GROUP}>
            <Badge variant={PHASE_TONE}>{t(phase)}</Badge>
            <Badge variant={RUN_STATUS_TONE[status]}>{runStatus(status)}</Badge>
        </span>
    );
}
