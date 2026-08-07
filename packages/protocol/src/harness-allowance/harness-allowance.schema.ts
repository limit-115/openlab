import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import { HarnessAllowanceState } from "#src/harness-allowance/harness-allowance.const";

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
 * What one harness account had left when it was last read. `windows` is empty whenever the state is
 * `unreadable`, so a viewer never renders a meter built from a failed reading.
 */
export const HarnessAllowanceSchema = z.object({
    harness: z.enum(AgentHarnessKind),
    state: z.enum(HarnessAllowanceState),
    /** The plan tier the vendor named. Null for a vendor that sells no tier. */
    plan: z.string().min(1).nullable(),
    /**
     * What a token-billed account has left to spend, in the vendor's own words. Null for a
     * subscription: a plan the operator already bought has no balance to run down, and showing money
     * beside one would invent a number the vendor never stated.
     */
    balance: z.string().min(1).nullable(),
    windows: z.array(AllowanceWindowSchema),
    error: z.string().min(1).nullable(),
    read_at: z.iso.datetime()
});

export const HarnessAllowanceRosterSchema = z.array(HarnessAllowanceSchema);
