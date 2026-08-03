import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { UsersIcon } from "lucide-react";
import { useState } from "react";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import { AgentRoster } from "#src/team/agent-roster";
import { AgentThread } from "#src/team/agent-thread";
import type { WatchedAgent } from "#src/team/agent-transcript.types";
import { NO_AGENTS_DESCRIPTION, NO_AGENTS_TITLE, TEAM_SPLIT } from "#src/team/team-panel.const";

interface TeamPanelProps {
    agents: readonly WatchedAgent[];
    tasks: InternalTask[];
}

export function TeamPanel({ agents, tasks }: TeamPanelProps) {
    const [chosenId, setChosenId] = useState<string | undefined>(undefined);

    /**
     * Falling back to the first agent keeps the panel readable when the chosen one leaves the
     * roster, which is what happens every time a cycle moves on to its next role.
     */
    const selected = agents.find(({ activity }) => activity.agent_id === chosenId) ?? agents[0];

    return (
        <Panel
            title="Team"
            description="Every agent the lab is running, and what each is doing"
            icon={UsersIcon}
        >
            {selected === undefined ? (
                <PanelEmptyState title={NO_AGENTS_TITLE} description={NO_AGENTS_DESCRIPTION} />
            ) : (
                <div className={TEAM_SPLIT}>
                    <AgentRoster
                        agents={agents}
                        tasks={tasks}
                        selectedId={selected.activity.agent_id}
                        onSelect={setChosenId}
                    />
                    <AgentThread
                        agent={selected}
                        task={tasks.find(({ id }) => id === selected.activity.task_id)}
                    />
                </div>
            )}
        </Panel>
    );
}
