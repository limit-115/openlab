import { SubscriptionAllowanceRosterSchema } from "@nightlab/protocol/subscription-allowance/subscription-allowance.schema";
import type { SubscriptionAllowanceRoster } from "@nightlab/protocol/subscription-allowance/subscription-allowance.types";

const SUBSCRIPTION_ALLOWANCE_ENDPOINT = "/api/subscriptions";

/** Tells the daemon to put the reading it is holding aside and ask the vendors again. */
const FRESH_READING_QUERY = "?fresh=1";

export const subscriptionAllowanceQueryKey = ["lab", "subscriptions"] as const;

/** Whatever the daemon has. Asking faster than it reads the vendors returns the same answer. */
export function fetchSubscriptionAllowance(
    signal?: AbortSignal
): Promise<SubscriptionAllowanceRoster> {
    return requestAllowance(SUBSCRIPTION_ALLOWANCE_ENDPOINT, signal);
}

/** What the vendors say right now, which is the only thing a refresh can honestly mean. */
export function refreshSubscriptionAllowance(
    signal?: AbortSignal
): Promise<SubscriptionAllowanceRoster> {
    return requestAllowance(`${SUBSCRIPTION_ALLOWANCE_ENDPOINT}${FRESH_READING_QUERY}`, signal);
}

async function requestAllowance(
    url: string,
    signal?: AbortSignal
): Promise<SubscriptionAllowanceRoster> {
    const response = await fetch(url, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });

    if (!response.ok) {
        throw new Error(`Subscriptions endpoint returned ${response.status}.`);
    }

    return SubscriptionAllowanceRosterSchema.parse(await response.json());
}
