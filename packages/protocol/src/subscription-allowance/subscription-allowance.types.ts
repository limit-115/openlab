import type { z } from "zod";
import type {
    AllowanceBalanceSchema,
    AllowanceWindowSchema,
    SubscriptionAllowanceRosterSchema,
    SubscriptionAllowanceSchema
} from "#src/subscription-allowance/subscription-allowance.schema";

export type AllowanceWindow = z.infer<typeof AllowanceWindowSchema>;
export type AllowanceBalance = z.infer<typeof AllowanceBalanceSchema>;
export type SubscriptionAllowance = z.infer<typeof SubscriptionAllowanceSchema>;
export type SubscriptionAllowanceRoster = z.infer<typeof SubscriptionAllowanceRosterSchema>;
