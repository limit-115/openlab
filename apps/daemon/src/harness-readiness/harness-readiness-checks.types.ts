import type { AgentHarness } from "@nightlab/harness/agent-harness.types";
import type { AgentHarnessKind } from "@nightlab/protocol/agents/agent-execution.const";

export interface HarnessReadinessOptions {
    /** Swapped in tests, where a real CLI would be launched three times per check. */
    readonly createHarness?: (kind: AgentHarnessKind) => AgentHarness;
    /** Epoch milliseconds, so a test can state when a check was taken. */
    readonly now?: () => number;
}
