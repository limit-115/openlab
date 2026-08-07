import { z } from "zod";
import { AgentHarnessKind } from "#src/agents/agent-execution.const";
import {
    NO_SPEND_CAP_PERCENT,
    type SpendCapKind,
    SpendCapKinds,
    SpendCapRefusal
} from "#src/spend-caps/spend-cap.const";
import { WalletAmountSchema } from "#src/subscription-allowance/subscription-allowance.schema";

/**
 * How far into one rolling window the lab may spend a subscription. The window is named by how long
 * it runs rather than by a vendor's field name, because its length is the one thing every vendor
 * states about it, and a plan that stops reporting a window leaves the cap standing rather than
 * quietly losing it.
 */
export const WindowPercentCapSchema = z.object({
    kind: z.literal(SpendCapKinds.WINDOW_PERCENT),
    harness: z.enum(AgentHarnessKind),
    window_minutes: z.number().int().positive(),
    /** Read against the consumption the vendor reports, so it is a ceiling on what is used. */
    max_used_percent: z.number().int().nonnegative().max(NO_SPEND_CAP_PERCENT)
});

/**
 * How little the lab may leave in a wallet. A wallet fills only when the operator pays into it, so
 * the cap on one is a floor rather than a share: it is the money they want still there when the lab
 * stops, stated in the currency the vendor reports it in, because a wallet that pays in two
 * currencies has two numbers and no rate the lab is entitled to invent between them.
 */
export const WalletFloorCapSchema = z.object({
    kind: z.literal(SpendCapKinds.WALLET_FLOOR),
    harness: z.enum(AgentHarnessKind),
    currency: z.string().trim().min(1),
    minimum_balance: WalletAmountSchema
});

export const SpendCapSchema = z.discriminatedUnion("kind", [
    WindowPercentCapSchema,
    WalletFloorCapSchema
]);

/**
 * Every cap the operator set. A window or a currency nobody capped is left out rather than written
 * down at the point that changes nothing: the absence is what says the lab may spend the whole of it.
 */
export const SpendCapsSchema = z
    .preprocess(namedKinds, z.array(SpendCapSchema))
    .refine(
        (caps) => distinct(caps, SpendCapKinds.WINDOW_PERCENT),
        SpendCapRefusal.DUPLICATE_WINDOW
    )
    .refine((caps) => distinct(caps, SpendCapKinds.WALLET_FLOOR), SpendCapRefusal.DUPLICATE_WALLET);

/**
 * A cap stored before caps had kinds is a window cap: it was the only kind there was. Naming it on
 * the way in keeps a lab that was already capped capped, because a cap dropped for want of a
 * discriminator would hand the vendor's whole ceiling back without telling anyone — which is the one
 * thing this setting exists to prevent.
 */
function namedKinds(caps: unknown): unknown {
    if (!Array.isArray(caps)) {
        return caps;
    }
    return caps.map((cap) =>
        typeof cap === "object" && cap !== null && !("kind" in cap)
            ? { ...cap, kind: SpendCapKinds.WINDOW_PERCENT }
            : cap
    );
}

/**
 * Whether one kind of cap names each of its meters once. Two caps on one meter name no point to stop
 * at, and which of them the lab would have obeyed is decided by list order, which is not a thing an
 * operator sets.
 */
function distinct(caps: readonly z.infer<typeof SpendCapSchema>[], kind: SpendCapKind): boolean {
    const meters = caps
        .filter((cap) => cap.kind === kind)
        .map((cap) =>
            cap.kind === SpendCapKinds.WINDOW_PERCENT
                ? `${cap.harness}:${cap.window_minutes}`
                : `${cap.harness}:${cap.currency}`
        );
    return new Set(meters).size === meters.length;
}
