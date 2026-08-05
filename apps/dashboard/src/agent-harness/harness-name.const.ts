import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";

/**
 * What a harness is called wherever the page names one. A vendor names its own harness, so this is
 * a spelling rather than a translation. GLM is Z.ai's coding plan driven through the Claude CLI,
 * and saying so keeps an operator from reading it as a second Claude subscription.
 */
export const HARNESS_NAME: Record<AgentHarnessKind, string> = {
    [AgentHarnessKind.CODEX]: "Codex",
    [AgentHarnessKind.CLAUDE]: "Claude",
    [AgentHarnessKind.GLM]: "GLM (Claude Harness)"
};
