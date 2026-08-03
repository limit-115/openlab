import { z } from "zod";
import { AssumptionStatus } from "#src/assumptions/assumption-status.const";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

export const AssumptionStatusSchema = z.enum(AssumptionStatus);

/**
 * A director's bet on where the goal might be reachable. It is a direction worth spending a
 * researcher on, not a hypothesis carrying a falsification test: what makes it good is that it
 * points somewhere nobody has looked, and what closes it is a researcher coming back empty.
 */
export const AssumptionSchema = z.object({
    id: IdentifierSchema,
    /** Which round of director thinking raised this bet, counting from zero. */
    cycle: z.int().nonnegative(),
    statement: z.string().trim().min(1),
    rationale: z.string().trim().min(1),
    status: AssumptionStatusSchema.default(AssumptionStatus.OPEN),
    /** Why the bet was closed, in the researcher's own words. */
    outcome: z.string().trim().min(1).optional(),
    created_at: z.iso.datetime(),
    updated_at: z.iso.datetime()
});
