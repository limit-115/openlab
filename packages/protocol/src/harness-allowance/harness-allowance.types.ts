import type { z } from "zod";
import type {
    AllowanceWindowSchema,
    HarnessAllowanceRosterSchema,
    HarnessAllowanceSchema
} from "#src/harness-allowance/harness-allowance.schema";

export type AllowanceWindow = z.infer<typeof AllowanceWindowSchema>;
export type HarnessAllowance = z.infer<typeof HarnessAllowanceSchema>;
export type HarnessAllowanceRoster = z.infer<typeof HarnessAllowanceRosterSchema>;
