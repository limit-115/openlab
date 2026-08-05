import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { DEFAULT_HARNESS_KINDS } from "#src/investigation-input/investigation-input.const";

/**
 * What the operator hands the lab. Naming no harnesses is a request for whatever the lab's own
 * roster is when the investigation opens, which is why the field can be left out here and cannot be
 * left out of what the lab then stores.
 */
export const InvestigationRequestSchema = z.object({
    goal: z.string().trim().min(1),
    context: z.array(z.string()).default([]),
    success_criteria: z.array(z.string()).default([]),
    /** The harnesses this investigation may dispatch to, rotated in the order they are given. */
    harness_kinds: z.array(z.enum(AgentHarnessKind)).nonempty().optional(),
    /**
     * Spends the subscriptions as far as their vendors will serve them, past the caps the lab is
     * held to everywhere else. It is the operator's override for one investigation that matters
     * more than the allowance it is spending, so it is off until they say otherwise.
     */
    spend_past_caps: z.boolean().default(false)
});

/**
 * What the lab holds once it has taken the investigation on. The roster is settled by then and
 * stays settled: changing the lab's default later is no reason to move work already under way.
 */
export const InvestigationInputSchema = InvestigationRequestSchema.extend({
    harness_kinds: z
        .array(z.enum(AgentHarnessKind))
        .nonempty()
        .default([...DEFAULT_HARNESS_KINDS])
});
