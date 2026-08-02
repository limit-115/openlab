import { type HarnessKind, HarnessKinds } from "@lab/harness/agent-harness.const";
import type { AgentHarness } from "@lab/harness/agent-harness.types";
import { ClaudeHarness } from "@lab/harness/claude-harness";
import { CodexHarness } from "@lab/harness/codex-harness";
import { GlmHarness } from "@lab/harness/glm-harness";

const HARNESS_FACTORY: Record<HarnessKind, () => AgentHarness> = {
    [HarnessKinds.CODEX]: () => new CodexHarness(),
    [HarnessKinds.CLAUDE]: () => new ClaudeHarness(),
    [HarnessKinds.GLM]: () => new GlmHarness()
};

/** Builds the roster a run rotates through, in the order the operator asked for. */
export function createHarnesses(kinds: readonly HarnessKind[]): AgentHarness[] {
    return kinds.map((kind) => HARNESS_FACTORY[kind]());
}
