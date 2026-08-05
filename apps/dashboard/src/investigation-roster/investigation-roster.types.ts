import type { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";

/** What the operator fills in to start an investigation. Everything but the goal is optional. */
export interface NewInvestigation {
    goal: string;
    context?: string[];
    success_criteria?: string[];
    harness_kinds?: AgentHarnessKind[];
}
