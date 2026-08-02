import type { z } from "zod";
import type { BranchSummarySchema } from "#src/branches/branch-summary.schema";

export type BranchSummary = z.infer<typeof BranchSummarySchema>;
