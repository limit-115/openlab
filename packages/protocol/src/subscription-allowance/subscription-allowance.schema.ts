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
 * Money as the vendor wrote it. It stays a decimal string end to end: a balance read as a float and
 * written back out is rounded, and this is the one number an operator sets a floor against.
 */
export const WalletAmountSchema = z
    .string()
    .trim()
    .regex(/^-?\d+(\.\d+)?$/, "A wallet amount is decimal money, written as the vendor writes it");

/**
 * What one currency of a wallet holds. A wallet can pay in more than one, and a vendor says so per
 * currency, so each is carried whole rather than folded into a total that no vendor stated.
 */
export const AllowanceBalanceSchema = z.object({
    currency: z.string().trim().min(1),
    amount: WalletAmountSchema
});

/**
 * What one subscription had left when it was last read. `windows` and `balances` are both empty
 * whenever the state is `unreadable`, so a viewer never renders a meter built from a failed reading,
 * and a vendor fills whichever of the two it meters by: a subscription reports windows, a wallet
 * reports balances, and neither is invented for a vendor that states the other.
 */
export const SubscriptionAllowanceSchema = z.object({
    harness: z.enum(AgentHarnessKind),
    state: z.enum(SubscriptionAllowanceState),
    /** The plan tier the vendor named, which is what identifies the account that answered. */
    plan: z.string().min(1).nullable(),
    windows: z.array(AllowanceWindowSchema),
    balances: z.array(AllowanceBalanceSchema),
    error: z.string().min(1).nullable(),
    read_at: z.iso.datetime()
});

export const SubscriptionAllowanceRosterSchema = z.array(SubscriptionAllowanceSchema);
