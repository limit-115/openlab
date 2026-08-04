import { z } from "zod";
import { IdentifierSchema } from "#src/entity-identity/entity-identifier.schema";

export const TaskInputSchema = z.object({
    id: IdentifierSchema.optional(),
    goal: z.string().trim().min(1),
    context: z.array(z.string()).default([]),
    success_criteria: z.array(z.string()).default([])
});
