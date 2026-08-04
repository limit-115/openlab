import type { z } from "zod";
import type { InvestigationSummarySchema } from "#src/investigation-status/investigation-summary.schema";

export type InvestigationSummary = z.infer<typeof InvestigationSummarySchema>;
