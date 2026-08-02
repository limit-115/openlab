import type { AgentSummary } from "@lab/protocol/agents/agent-summary.types";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import type { BranchSummary } from "@lab/protocol/branches/branch-summary.types";
import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { GitBranchIcon } from "lucide-react";
import { Badge } from "#src/design-system/badge";
import { Panel } from "#src/panel/panel";
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
            id="operations"
            title="Branches & agents"
            description="Independent directions"
            icon={GitBranchIcon}
            action={<Badge variant="outline">{branches.length} branches</Badge>}
        >
            {branches.length > 0 ? (
                <ul className={BRANCH_LIST}>
                    {branches.map((branch, index) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            agents={agents.filter((agent) => agent.branch_id === branch.id)}
                            tasks={tasks.filter((task) => task.branch_id === branch.id)}
                            initiallyOpen={index < 2 && branch.status === BranchStatus.ACTIVE}
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
