import { z } from "zod";

/** A release the lab does not have, and where to read what is in it. */
export const ReleaseNoticeSchema = z.object({
    offered_version: z.string().min(1),
    notes_url: z.url()
});

/**
 * What the lab answers when asked whether it is behind.
 *
 * The lab does not look this up. Whoever started it found out — from the release channel, against
 * the key the program was built trusting — and the lab repeats it, because installing a release is
 * the program's business and running investigations is the lab's.
 *
 * Nothing newer is an answer, not the absence of one: a lab that was never installed by the program
 * and a lab already on the current release both say the same thing, which is that there is nothing
 * to tell the operator.
 */
export const ReleaseNoticeResponseSchema = z.object({
    running_version: z.string().min(1),
    newer: ReleaseNoticeSchema.nullable()
});
