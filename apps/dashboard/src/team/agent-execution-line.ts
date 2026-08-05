import type { AgentExecution } from "@openlab/protocol/agents/agent-execution.types";
import type { TFunction } from "i18next";
import { HARNESS_NAME } from "#src/agent-harness/harness-name.const";
import type { TEAM_NAMESPACE } from "#src/team/team.i18n";

/**
 * What an agent actually runs on, in one line: the harness, the exact model the run resolved to
 * and the effort it runs at. The roster and the thread read from here, so an operator never has to
 * open an agent to learn which model is producing its work.
 */
export function agentExecutionLine(
    { harness, model, effort }: AgentExecution,
    t: TFunction<typeof TEAM_NAMESPACE>
): string {
    return t("execution", { harness: HARNESS_NAME[harness], model, effort: t(effort) });
}
