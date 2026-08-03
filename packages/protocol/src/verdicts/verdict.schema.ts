import { z } from "zod";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

/**
 * An independent verifier's answer about one finding. The verifier chose how to check it, so the
 * only structure asked of it is the answer itself and the prose behind it — everything the daemon
 * branches on is `confirmed`, and everything a human needs is `reasoning`.
 */
export const VerdictSchema = z.object({
    id: IdentifierSchema,
    finding_id: IdentifierSchema,
    run_id: IdentifierSchema,
    confirmed: z.boolean(),
    reasoning: z.string().trim().min(1),
    created_at: z.iso.datetime()
});
