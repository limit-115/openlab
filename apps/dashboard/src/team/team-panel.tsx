import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { UsersIcon } from "lucide-react";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import { AgentCard } from "#src/team/agent-card";
import type { WatchedAgent } from "#src/team/agent-transcript.types";
import { NO_AGENTS_DESCRIPTION, NO_AGENTS_TITLE, TEAM_GRID } from "#src/team/team-panel.const";

interface TeamPanelProps {
    agents: readonly WatchedAgent[];
    tasks: InternalTask[];
}

export function TeamPanel({ agents, tasks }: TeamPanelProps) {
    return (
        <Panel
            title="Team"
            description="Every agent the lab is running, and what each is doing"
            icon={UsersIcon}
        >
            {agents.length > 0 ? (
                <div className={TEAM_GRID}>
                    {agents.map((agent) => (
                        <AgentCard
                            key={agent.activity.agent_id}
                            agent={agent}
                            task={tasks.find(({ id }) => id === agent.activity.task_id)}
                        />
                    ))}
                </div>
            ) : (
                <PanelEmptyState title={NO_AGENTS_TITLE} description={NO_AGENTS_DESCRIPTION} />
            )}
        </Panel>
    );
}
