import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { SubscriptionAllowanceState } from "#src/subscription-allowance/subscription-allowance.const";

/**
 * One rolling window a vendor meters. The three vendors disagree on how many windows they keep and
 * how long each runs, so a window states its own length instead of being sorted into a shared
 * taxonomy that would have to invent a name for whatever a vendor adds next.
 */
export const AllowanceWindowSchema = z.object({
    duration_minutes: z.number().int().positive(),
    /** Vendors report consumption, not headroom, and none of them stops exactly at 100. */
    used_percent: z.number().nonnegative(),
    resets_at: z.iso.datetime().nullable()
});

/**
 * What one subscription had left when it was last read. `windows` is empty whenever the state is
 * `unreadable`, so a viewer never renders a meter built from a failed reading.
 */
export const SubscriptionAllowanceSchema = z.object({
    harness: z.enum(AgentHarnessKind),
    state: z.enum(SubscriptionAllowanceState),
    /** The plan tier the vendor named, which is what tells the operator which account answered. */
    plan: z.string().min(1).nullable(),
    windows: z.array(AllowanceWindowSchema),
    error: z.string().min(1).nullable(),
    read_at: z.iso.datetime()
});

export const SubscriptionAllowanceRosterSchema = z.array(SubscriptionAllowanceSchema);
