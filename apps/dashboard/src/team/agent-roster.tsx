import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { cn } from "#src/design-system/class-names";
import { agentExecutionLine } from "#src/team/agent-execution-line";
import { agentLatestLine } from "#src/team/agent-latest-line";
import { AgentStatusBadges } from "#src/team/agent-status-badges";
import type { WatchedAgent } from "#src/team/agent-transcript.types";
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
    tasks: InternalTask[];
    selectedId: string;
    onSelect: (agentId: string) => void;
}

/**
 * Every agent the lab is running, each saying who it is, what it was given and what it is doing
 * right now. Reading one of them in full is a click away and does not hide the others.
 */
export function AgentRoster({ agents, tasks, selectedId, onSelect }: AgentRosterProps) {
    return (
        <ul className={TEAM_ROSTER} aria-label="Agents">
            {agents.map((agent) => {
                const { activity } = agent;
                const task = tasks.find(({ id }) => id === activity.task_id);
                const line = agentLatestLine(agent);

                return (
                    <li key={activity.agent_id}>
                        <button
                            type="button"
                            aria-pressed={activity.agent_id === selectedId}
                            onClick={() => onSelect(activity.agent_id)}
                            className={cn(
                                ROSTER_ENTRY,
                                activity.agent_id === selectedId && ROSTER_ENTRY_SELECTED
                            )}
                        >
                            <span className={ROSTER_ENTRY_TOP}>
                                <span className={ROSTER_ROLE}>{activity.role}</span>
                                <AgentStatusBadges
                                    phase={activity.phase}
                                    status={activity.status}
                                />
                            </span>

                            <span className={ROSTER_EXECUTION}>
                                {agentExecutionLine(activity.execution)}
                            </span>

                            {task === undefined ? null : (
                                <span className={ROSTER_OBJECTIVE}>{task.objective}</span>
                            )}

                            <span className={ROSTER_LINE}>
                                <span className={ROSTER_VERB}>{line.verb}</span>
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
