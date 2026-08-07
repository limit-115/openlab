import type { z } from "zod";
import type { LeadSchema } from "#src/leads/lead.schema";

export type Lead = z.infer<typeof LeadSchema>;
