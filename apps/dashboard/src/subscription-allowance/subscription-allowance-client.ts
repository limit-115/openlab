import { SubscriptionAllowanceRosterSchema } from "@lab/protocol/subscription-allowance/subscription-allowance.schema";
import type { SubscriptionAllowanceRoster } from "@lab/protocol/subscription-allowance/subscription-allowance.types";

export const subscriptionAllowanceQueryKey = ["lab", "subscriptions"] as const;

export async function fetchSubscriptionAllowance(
    signal?: AbortSignal
): Promise<SubscriptionAllowanceRoster> {
    const response = await fetch("/api/subscriptions", {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });

    if (!response.ok) {
        throw new Error(`Subscriptions endpoint returned ${response.status}.`);
    }

    return SubscriptionAllowanceRosterSchema.parse(await response.json());
}
