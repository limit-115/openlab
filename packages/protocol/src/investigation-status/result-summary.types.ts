import type { z } from "zod";
import type { ResultSummarySchema } from "#src/investigation-status/result-summary.schema";

export type ResultSummary = z.infer<typeof ResultSummarySchema>;
