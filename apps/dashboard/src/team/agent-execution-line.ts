import type { AgentExecution } from "@lab/protocol/agents/agent-execution.types";
import { HARNESS_LABEL } from "#src/team/team-panel.const";

/**
 * What an agent actually runs on, in one line: the harness, the exact model the run resolved to
 * and the effort it runs at. The roster and the thread read from here, so an operator never has to
 * open an agent to learn which model is producing its work.
 */
export function agentExecutionLine({ harness, model, effort }: AgentExecution): string {
    return `${HARNESS_LABEL[harness]} · ${model} · ${effort} effort`;
}
