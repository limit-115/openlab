import type { z } from "zod";
import type {
    HarnessReadinessRosterSchema,
    HarnessReadinessSchema
} from "#src/harness-readiness/harness-readiness.schema";

export type HarnessReadiness = z.infer<typeof HarnessReadinessSchema>;
export type HarnessReadinessRoster = z.infer<typeof HarnessReadinessRosterSchema>;
