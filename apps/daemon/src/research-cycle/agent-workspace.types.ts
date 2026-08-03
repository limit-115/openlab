import type { AgentRole } from "@lab/protocol/agents/agent-role.const";

export interface AgentWorkspace {
    readonly id: string;
    readonly role: AgentRole;
    readonly cwd: string;
    readonly artifactDirectory: string;
}

export interface AgentWorkspaceFactory {
    create(role: AgentRole, ordinal: number): Promise<AgentWorkspace>;
}
