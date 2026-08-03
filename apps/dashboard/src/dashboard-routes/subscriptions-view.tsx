import { useQuery } from "@tanstack/react-query";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import {
    fetchSubscriptionAllowance,
    subscriptionAllowanceQueryKey
} from "#src/subscription-allowance/subscription-allowance-client";
import { SubscriptionAllowancePanel } from "#src/subscription-allowance/subscription-allowance-panel";
import {
    ALLOWANCE_REFETCH_MILLISECONDS,
    NO_ALLOWANCE_DESCRIPTION,
    NO_ALLOWANCE_TITLE
} from "#src/subscription-allowance/subscription-allowance-panel.const";

/**
 * The readings belong to this route, and only this address renders them, so the vendors are asked
 * about the allowance while somebody is looking at it. A runtime that does not serve them says so
 * outright: an operator who came here for the numbers is owed the reason there are none.
 */
export function SubscriptionsView() {
    const allowances = useQuery({
        queryKey: subscriptionAllowanceQueryKey,
        queryFn: ({ signal }) => fetchSubscriptionAllowance(signal),
        retry: false,
        staleTime: ALLOWANCE_REFETCH_MILLISECONDS,
        refetchInterval: ALLOWANCE_REFETCH_MILLISECONDS,
        refetchOnWindowFocus: true
    });

    if (allowances.data === undefined) {
        return allowances.isPending ? (
            <LoadingDashboard />
        ) : (
            <PanelEmptyState title={NO_ALLOWANCE_TITLE} description={NO_ALLOWANCE_DESCRIPTION} />
        );
    }

    return <SubscriptionAllowancePanel allowances={allowances.data} />;
}
