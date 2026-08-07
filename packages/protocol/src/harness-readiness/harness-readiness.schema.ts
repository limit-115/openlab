import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { HarnessReadinessState } from "#src/harness-readiness/harness-readiness.const";

/**
 * Whether one harness can run, as of the moment the lab last ran its CLI. `cli_version`, `plan` and
 * `balance` are what the two checks got back, so a ready harness proves itself by naming the version
 * that answered and the account it is signed in to rather than by asserting it is fine.
 */
export const HarnessReadinessSchema = z.object({
    harness: z.enum(AgentHarnessKind),
    state: z.enum(HarnessReadinessState),
    cli_version: z.string().min(1).nullable(),
    plan: z.string().min(1).nullable(),
    /** What a usage-billed harness has left to spend. A subscription harness carries none. */
    balance: z.string().min(1).nullable(),
    error: z.string().min(1).nullable(),
    checked_at: z.iso.datetime()
});

export const HarnessReadinessRosterSchema = z.array(HarnessReadinessSchema);
