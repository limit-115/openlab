import type { AgentRun } from "@nightlab/protocol/agent-runs/agent-run.types";
import { useTranslation } from "react-i18next";
import { cn } from "#src/design-system/class-names";
import { agentExecutionLine } from "#src/team/agent-execution-line";
import { agentLatestLine } from "#src/team/agent-latest-line";
import { AgentStatusBadges } from "#src/team/agent-status-badges";
import type { WatchedAgent } from "#src/team/agent-transcript.types";
import { TEAM_NAMESPACE } from "#src/team/team.i18n";
import {
    ROSTER_DETAIL,
    ROSTER_ENTRY,
    ROSTER_ENTRY_SELECTED,
    ROSTER_ENTRY_TOP,
    ROSTER_EXECUTION,
    ROSTER_LINE,
    ROSTER_OBJECTIVE,
    ROSTER_ROLE,
    ROSTER_VERB,
    TEAM_ROSTER
} from "#src/team/team-panel.const";

interface AgentRosterProps {
    agents: readonly WatchedAgent[];
    runs: AgentRun[];
    selectedId: string;
    onSelect: (runId: string) => void;
}

/**
 * Every agent the investigation is running, each saying who it is, what it was given and what it is doing
 * right now. Reading one of them in full is a click away and does not hide the others.
 */
export function AgentRoster({ agents, runs, selectedId, onSelect }: AgentRosterProps) {
    const { t } = useTranslation(TEAM_NAMESPACE);

    return (
        <ul className={TEAM_ROSTER} aria-label={t("agents")}>
            {agents.map((agent) => {
                const { activity } = agent;
                const run = runs.find(({ id }) => id === activity.run_id);
                const line = agentLatestLine(agent);

                return (
                    <li key={activity.run_id}>
                        <button
                            type="button"
                            aria-pressed={activity.run_id === selectedId}
                            onClick={() => onSelect(activity.run_id)}
                            className={cn(
                                ROSTER_ENTRY,
                                activity.run_id === selectedId && ROSTER_ENTRY_SELECTED
                            )}
                        >
                            <span className={ROSTER_ENTRY_TOP}>
                                <span className={ROSTER_ROLE}>{t(activity.role)}</span>
                                <AgentStatusBadges
                                    phase={activity.phase}
                                    status={activity.status}
                                />
                            </span>

                            <span className={ROSTER_EXECUTION}>
                                {agentExecutionLine(activity.execution, t)}
                            </span>

                            {run === undefined ? null : (
                                <span className={ROSTER_OBJECTIVE}>{run.objective}</span>
                            )}

                            <span className={ROSTER_LINE}>
                                <span className={ROSTER_VERB}>
                                    {line.toolName ?? t(line.phase)}
                                </span>
                                {line.detail === null ? null : (
                                    <span className={ROSTER_DETAIL}>{line.detail}</span>
                                )}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
