import type { HarnessRunStatus } from "#src/agent-harness/agent-harness.const";

/** How a finished run ended, as its manifest records it. */
export interface FinishedRunOutcome {
    readonly status: HarnessRunStatus;
    readonly error: string | null;
    readonly finishedAt: string;
}
