import { z } from "zod";

export const ResultSummarySchema = z.object({
    summary: z.string(),
    report_path: z.string().optional(),
    result_path: z.string().optional(),
    limitations: z.array(z.string()).default([])
});
