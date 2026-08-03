import type {
    AgentActivityPhase,
    AgentRunStatus
} from "@lab/protocol/agent-activity/agent-activity.const";
import { Badge } from "#src/design-system/badge";
import {
    AGENT_STATUS_GROUP,
    PHASE_LABEL,
    PHASE_TONE,
    RUN_STATUS_LABEL,
    RUN_STATUS_TONE
} from "#src/team/team-panel.const";

interface AgentStatusBadgesProps {
    phase: AgentActivityPhase;
    status: AgentRunStatus;
}

/**
 * What the agent is doing and how its run is going, as the same pair of badges wherever an agent
 * appears. A span rather than a div, because a roster entry is a button and carries these too.
 */
export function AgentStatusBadges({ phase, status }: AgentStatusBadgesProps) {
    return (
        <span className={AGENT_STATUS_GROUP}>
            <Badge variant={PHASE_TONE}>{PHASE_LABEL[phase]}</Badge>
            <Badge variant={RUN_STATUS_TONE[status]}>{RUN_STATUS_LABEL[status]}</Badge>
        </span>
    );
}
