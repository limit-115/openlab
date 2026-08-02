import type { AgentSummary } from "@lab/protocol/agents/agent-summary.types";
import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { cn } from "#src/design-system/class-names";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemTitle
} from "#src/design-system/item";
import {
    AGENT_EXECUTION_PENDING,
    AGENT_HARNESS_LABEL,
    AGENT_PRESENCE,
    AGENT_PRESENCE_TONE,
    AGENT_STATUS
} from "#src/research-branches/branch-agents.const";
import { BRANCH_DETAIL_HEADING } from "#src/research-branches/branch-card.const";

interface BranchAgentsProps {
    agents: AgentSummary[];
    tasks: InternalTask[];
}

export function BranchAgents({ agents, tasks }: BranchAgentsProps) {
    return (
        <div>
            <h3 className={BRANCH_DETAIL_HEADING}>Agents</h3>
            {agents.length > 0 ? (
                <ItemGroup className="gap-2">
                    {agents.map((agent) => {
                        const currentTask = tasks.find((task) => task.id === agent.current_task_id);

                        return (
                            <Item key={agent.id} asChild variant="muted" size="sm">
                                <li>
                                    <ItemMedia>
                                        <span
                                            className={cn(
                                                AGENT_PRESENCE,
                                                AGENT_PRESENCE_TONE[agent.status]
                                            )}
                                            aria-hidden="true"
                                        />
                                    </ItemMedia>
                                    <ItemContent>
                                        <ItemTitle className="capitalize">{agent.role}</ItemTitle>
                                        <ItemDescription>
                                            {currentTask?.objective ?? agent.id}
                                        </ItemDescription>
                                        <ItemDescription>
                                            {agent.execution === undefined
                                                ? AGENT_EXECUTION_PENDING
                                                : `${AGENT_HARNESS_LABEL[agent.execution.harness]} · ${agent.execution.model} · ${agent.execution.effort} effort`}
                                        </ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        <span className={AGENT_STATUS}>{agent.status}</span>
                                    </ItemActions>
                                </li>
                            </Item>
                        );
                    })}
                </ItemGroup>
            ) : (
                <p className="text-sm text-muted-foreground">No agents assigned</p>
            )}
        </div>
    );
}
