import type { z } from "zod";
import type { InvestigationInputSchema } from "#src/investigation-input/investigation-input.schema";

export type InvestigationInput = z.infer<typeof InvestigationInputSchema>;
