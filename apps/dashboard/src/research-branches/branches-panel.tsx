import { BranchStatus } from "@lab/protocol/constants";
import type { InternalTask } from "@lab/protocol/schemas";
import type { AgentSummary, BranchSummary } from "@lab/protocol/status";
import { GitBranch } from "lucide-react";
import { Panel } from "#src/panel/panel";
import { PANEL_COUNT_BADGE } from "#src/panel/panel.const";
import { EmptyState } from "#src/panel/panel-empty-state";
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
            eyebrow="Independent directions"
            icon={GitBranch}
            action={<span className={PANEL_COUNT_BADGE}>{branches.length} branches</span>}
        >
            {branches.length > 0 ? (
                <div className={BRANCH_LIST}>
                    {branches.map((branch, index) => (
                        <BranchCard
                            key={branch.id}
                            branch={branch}
                            agents={agents.filter((agent) => agent.branch_id === branch.id)}
                            tasks={tasks.filter((task) => task.branch_id === branch.id)}
                            initiallyOpen={index < 2 && branch.status === BranchStatus.ACTIVE}
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
