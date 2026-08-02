import type { InternalTask } from "@lab/protocol/schemas";
import type { AgentSummary, BranchSummary } from "@lab/protocol/status";
import {
    Bot,
    ChevronDown,
    CircleCheck,
    CircleDashed,
    GitBranch,
    ListTodo,
    Pause,
    Play
} from "lucide-react";
import { EmptyState } from "#src/components/empty-state";
import { Panel } from "#src/components/panel";
import { formatIdentifier } from "#src/lib/format";

interface BranchesPanelProps {
    branches: BranchSummary[];
    agents: AgentSummary[];
    tasks: InternalTask[];
}

export function BranchesPanel({ branches, agents, tasks }: BranchesPanelProps) {
    return (
        <Panel
            id="operations"
            title="Branches & agents"
            eyebrow="Independent directions"
            icon={GitBranch}
            action={<span className="count-badge">{branches.length} branches</span>}
        >
            {branches.length > 0 ? (
                <div className="branch-list">
                    {branches.map((branch, index) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            agents={agents.filter((agent) => agent.branch_id === branch.id)}
                            tasks={tasks.filter((task) => task.branch_id === branch.id)}
                            initiallyOpen={index < 2 && branch.status === "active"}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    title="No research branches yet"
                    description="The Director will create independent directions after understanding the goal."
                />
            )}
        </Panel>
    );
}

interface BranchCardProps {
    branch: BranchSummary;
    agents: AgentSummary[];
    tasks: InternalTask[];
    initiallyOpen: boolean;
}

function BranchCard({ branch, agents, tasks, initiallyOpen }: BranchCardProps) {
    const runningTasks = tasks.filter((task) => ["leased", "running"].includes(task.status)).length;
    const StatusIcon =
        branch.status === "active" ? Play : branch.status === "paused" ? Pause : CircleCheck;

    return (
        <details className="branch-card" open={initiallyOpen}>
            <summary>
                <span className={`branch-card__status branch-card__status--${branch.status}`}>
                    <StatusIcon size={13} fill="currentColor" aria-hidden="true" />
                </span>
                <span className="branch-card__heading">
                    <strong>{branch.title}</strong>
                    <span>{branch.approach}</span>
                </span>
                <span className="branch-card__meta">
                    <span>
                        <Bot size={13} aria-hidden="true" /> {agents.length}
                    </span>
                    <span>
                        <ListTodo size={13} aria-hidden="true" /> {runningTasks}/{tasks.length}
                    </span>
                </span>
                <ChevronDown className="branch-card__chevron" size={16} aria-hidden="true" />
            </summary>
            <div className="branch-card__content">
                {branch.progress ? <p className="branch-progress">{branch.progress}</p> : null}
                <div className="branch-detail-grid">
                    <div>
                        <h3 className="branch-detail-heading">Agents</h3>
                        {agents.length > 0 ? (
                            <ul className="agent-list">
                                {agents.map((agent) => {
                                    const currentTask = tasks.find(
                                        (task) => task.id === agent.current_task_id
                                    );

                                    return (
                                        <li key={agent.id}>
                                            <span
                                                className={`presence presence--${agent.status}`}
                                                aria-hidden="true"
                                            />
                                            <div>
                                                <strong>{agent.role}</strong>
                                                <span>
                                                    {currentTask?.objective ??
                                                        formatIdentifier(agent.id)}
                                                </span>
                                            </div>
                                            <small>{agent.status}</small>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="quiet">No agents assigned</p>
                        )}
                    </div>
                    <div>
                        <h3 className="branch-detail-heading">Tasks</h3>
                        {tasks.length > 0 ? (
                            <ul className="task-list">
                                {tasks.map((task) => (
                                    <li key={task.id}>
                                        {task.status === "succeeded" ? (
                                            <CircleCheck size={14} aria-hidden="true" />
                                        ) : (
                                            <CircleDashed size={14} aria-hidden="true" />
                                        )}
                                        <span>{task.objective}</span>
                                        <small className={`tag tag--${task.status}`}>
                                            {task.status}
                                        </small>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="quiet">No tasks created</p>
                        )}
                    </div>
                </div>
            </div>
        </details>
    );
}
