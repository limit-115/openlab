import type { InternalTask } from "@lab/protocol/schemas";
import type { AgentSummary } from "@lab/protocol/status";
import { QUIET_NOTE } from "#src/panel/panel-empty-state.const";
import {
    AGENT_LIST,
    AGENT_PRESENCE,
    AGENT_PRESENCE_TONE,
    AGENT_ROLE,
    AGENT_ROW,
    AGENT_STATUS,
    AGENT_TASK
} from "#src/research-branches/branch-agents.const";
import { BRANCH_DETAIL_HEADING } from "#src/research-branches/branch-card.const";
import { formatIdentifier } from "#src/value-display/identifier-display";

interface BranchAgentsProps {
    agents: AgentSummary[];
    tasks: InternalTask[];
}

export function BranchAgents({ agents, tasks }: BranchAgentsProps) {
    return (
        <div>
            <h3 className={BRANCH_DETAIL_HEADING}>Agents</h3>
            {agents.length > 0 ? (
                <ul className={AGENT_LIST}>
                    {agents.map((agent) => {
                        const currentTask = tasks.find((task) => task.id === agent.current_task_id);

                        return (
                            <li key={agent.id} className={AGENT_ROW}>
                                <span
                                    className={`${AGENT_PRESENCE} ${AGENT_PRESENCE_TONE[agent.status]}`}
                                    aria-hidden="true"
                                />
                                <div className="flex min-w-0 flex-col">
                                    <strong className={AGENT_ROLE}>{agent.role}</strong>
                                    <span className={AGENT_TASK}>
                                        {currentTask?.objective ?? formatIdentifier(agent.id)}
                                    </span>
                                </div>
                                <small className={AGENT_STATUS}>{agent.status}</small>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className={QUIET_NOTE}>No agents assigned</p>
            )}
        </div>
    );
}
