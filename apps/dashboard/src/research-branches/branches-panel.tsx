import type { AgentSummary } from "@lab/protocol/agents/agent-summary.types";
import type { BranchSummary } from "@lab/protocol/branches/branch-summary.types";
import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { Badge } from "#src/design-system/badge";
import { cn } from "#src/design-system/class-names";
import { Panel } from "#src/panel/panel";
import { PANEL_SCROLLER } from "#src/panel/panel.const";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import { BranchCard } from "#src/research-branches/branch-card";
import { BRANCH_LIST } from "#src/research-branches/branch-card.const";

interface BranchesPanelProps {
    branches: BranchSummary[];
    agents: AgentSummary[];
    tasks: InternalTask[];
}

export function BranchesPanel({ branches, agents, tasks }: BranchesPanelProps) {
    return (
        <Panel
            title="Branches & agents"
            description="Independent directions"
            action={<Badge variant="outline">{branches.length} branches</Badge>}
        >
            {branches.length > 0 ? (
                <ul className={cn(BRANCH_LIST, PANEL_SCROLLER)}>
                    {branches.map((branch) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            agents={agents.filter((agent) => agent.branch_id === branch.id)}
                            tasks={tasks.filter((task) => task.branch_id === branch.id)}
                        />
                    ))}
                </ul>
            ) : (
                <PanelEmptyState
                    title="No research branches yet"
                    description="The Director will create independent directions after understanding the goal."
                />
            )}
        </Panel>
    );
}
