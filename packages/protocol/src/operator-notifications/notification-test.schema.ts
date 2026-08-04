import { z } from "zod";
import { NotificationChannelKind } from "#src/operator-notifications/notification-channel.const";

/**
 * Trying a channel out names only which one. It is sent through what the lab has stored rather than
 * what a page is holding, so a test says whether the lab can reach the operator rather than whether
 * something typed into a form would have.
 */
export const NotificationTestRequestSchema = z.object({
    kind: z.enum(NotificationChannelKind)
});

/**
 * What came of it. A refusal carries the vendor's own sentence, which is the part that names the
 * field to fix and the one part of this the lab cannot say in the operator's language.
 */
export const NotificationTestResultSchema = z.object({
    kind: z.enum(NotificationChannelKind),
    delivered: z.boolean(),
    reason: z.string().optional()
});
