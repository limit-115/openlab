import { HarnessKinds } from "@lab/harness/agent-harness.const";

/**
 * Every harness a run rotates through unless the operator pins a smaller roster. The order is the
 * rotation itself, so moving an entry changes which harness each stage of a cycle lands on.
 */
export const DEFAULT_HARNESS_KINDS = [
    HarnessKinds.CODEX,
    HarnessKinds.CLAUDE,
    HarnessKinds.GLM
] as const;
