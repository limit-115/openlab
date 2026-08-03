import { z } from "zod";

/**
 * Whatever the operator types back. A refusal, a redirection, a credential, a question of their
 * own — the daemon carries the prose to the agent verbatim and reads no meaning into it.
 */
export const AnswerCapabilitySchema = z.object({
    answer: z.string().trim().min(1)
});
