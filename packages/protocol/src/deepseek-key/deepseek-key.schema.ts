import { z } from "zod";

/**
 * The DeepSeek key an operator hands the lab. It is taken once and never served back: they typed it,
 * so returning it tells them nothing they do not know and every copy is somewhere else it can leak
 * from. The setup page is told only whether the lab is holding one.
 */
export const DeepseekKeySchema = z.object({
    api_key: z.string().trim().min(1)
});

/** What the lab will say about the key: that it has one, or that it has none. */
export const DeepseekKeyStateSchema = z.object({
    key_set: z.boolean()
});
