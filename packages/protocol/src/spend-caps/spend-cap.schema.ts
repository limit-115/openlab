import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { NO_SPEND_CAP_PERCENT, SpendCapRefusal } from "#src/spend-caps/spend-cap.const";

/**
 * How far into one rolling window the lab may spend a subscription. The window is named by how long
 * it runs rather than by a vendor's field name, because its length is the one thing every vendor
 * states about it, and a plan that stops reporting a window leaves the cap standing rather than
 * quietly losing it.
 */
export const SpendCapSchema = z.object({
    harness: z.enum(AgentHarnessKind),
    window_minutes: z.number().int().positive(),
    /** Read against the consumption the vendor reports, so it is a ceiling on what is used. */
    max_used_percent: z.number().int().nonnegative().max(NO_SPEND_CAP_PERCENT)
});

/**
 * Every cap the operator set. A window nobody capped is left out rather than written down at the
 * vendor's ceiling: the absence is what says the lab may spend the whole of it.
 */
export const SpendCapsSchema = z
    .array(SpendCapSchema)
    .refine(
        (caps) =>
            new Set(caps.map(({ harness, window_minutes }) => `${harness}:${window_minutes}`))
                .size === caps.length,
        SpendCapRefusal.DUPLICATE_WINDOW
    );
