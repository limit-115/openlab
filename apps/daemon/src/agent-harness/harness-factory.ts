import type { AgentHarness } from "@openlab/harness/agent-harness.types";
import { ClaudeHarness } from "@openlab/harness/claude-harness";
import { CodexHarness } from "@openlab/harness/codex-harness";
import { DeepseekHarness } from "@openlab/harness/deepseek-harness";
import { GlmHarness } from "@openlab/harness/glm-harness";
import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";

const HARNESS_FACTORY: Record<AgentHarnessKind, () => AgentHarness> = {
    [AgentHarnessKind.CODEX]: () => new CodexHarness(),
    [AgentHarnessKind.CLAUDE]: () => new ClaudeHarness(),
    [AgentHarnessKind.GLM]: () => new GlmHarness(),
    [AgentHarnessKind.DEEPSEEK]: () => new DeepseekHarness()
};

/** Every kind the lab can run, which is what a lab being set up has to be told about. */
export const EVERY_HARNESS_KIND: readonly AgentHarnessKind[] = Object.values(AgentHarnessKind);

export function createHarness(kind: AgentHarnessKind): AgentHarness {
    return HARNESS_FACTORY[kind]();
}

/** Builds the roster one investigation rotates through, in the order the operator asked for. */
export function createHarnesses(kinds: readonly AgentHarnessKind[]): AgentHarness[] {
    return kinds.map(createHarness);
}
