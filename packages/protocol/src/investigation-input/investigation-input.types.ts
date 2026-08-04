import type { z } from "zod";
import type {
    InvestigationInputSchema,
    InvestigationRequestSchema
} from "#src/investigation-input/investigation-input.schema";

export type InvestigationRequest = z.infer<typeof InvestigationRequestSchema>;
export type InvestigationInput = z.infer<typeof InvestigationInputSchema>;
