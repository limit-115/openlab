import { AgentHarnessKind } from "#src/agents/agent-execution.const";

/**
 * The roster an investigation rotates through when the operator names none. The order is the
 * rotation itself, so moving an entry changes which harness each stage of a cycle lands on.
 */
export const DEFAULT_HARNESS_KINDS = [
    AgentHarnessKind.CODEX,
    AgentHarnessKind.CLAUDE,
    AgentHarnessKind.GLM
] as const;
