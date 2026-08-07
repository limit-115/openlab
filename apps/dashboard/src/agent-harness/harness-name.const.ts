import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";

/**
 * What a harness is called wherever the page names one. A vendor names its own harness, so this is
 * a spelling rather than a translation. Two of them are driven through another vendor's CLI, and
 * saying which keeps an operator from reading them as a second subscription to that vendor.
 */
export const HARNESS_NAME: Record<AgentHarnessKind, string> = {
    [AgentHarnessKind.CODEX]: "Codex",
    [AgentHarnessKind.CLAUDE]: "Claude",
    [AgentHarnessKind.GLM]: "GLM (Claude Harness)",
    [AgentHarnessKind.DEEPSEEK]: "DeepSeek (Codex Harness)"
};
