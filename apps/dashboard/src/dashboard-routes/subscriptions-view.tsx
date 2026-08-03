import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { SUBSCRIPTIONS_PAGE } from "#src/dashboard-routes/subscriptions-view.const";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import { AllowanceReadingHeader } from "#src/subscription-allowance/allowance-reading-header";
import { allowanceReadingTime } from "#src/subscription-allowance/allowance-reading-time";
import {
    fetchSubscriptionAllowance,
    refreshSubscriptionAllowance,
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
    const queryClient = useQueryClient();
    const allowances = useQuery({
        queryKey: subscriptionAllowanceQueryKey,
        queryFn: ({ signal }) => fetchSubscriptionAllowance(signal),
        retry: false,
        staleTime: ALLOWANCE_REFETCH_MILLISECONDS,
        refetchInterval: ALLOWANCE_REFETCH_MILLISECONDS,
        refetchOnWindowFocus: true
    });

    /**
     * A refresh goes past whatever the daemon is holding and onto the vendors, so the reading the
     * operator gets back is the one they asked for. Its answer is handed to the polling query, and
     * the interval carries on from there.
     */
    const refresh = useMutation({
        mutationFn: () => refreshSubscriptionAllowance(),
        onSuccess: (roster) => queryClient.setQueryData(subscriptionAllowanceQueryKey, roster)
    });

    if (allowances.data === undefined) {
        return allowances.isPending ? (
            <LoadingDashboard />
        ) : (
            <PanelEmptyState title={NO_ALLOWANCE_TITLE} description={NO_ALLOWANCE_DESCRIPTION} />
        );
    }

    return (
        <div className={SUBSCRIPTIONS_PAGE}>
            <AllowanceReadingHeader
                readAt={allowanceReadingTime(allowances.data)}
                refresh={() => refresh.mutate()}
                refreshing={refresh.isPending}
                failed={refresh.isError}
            />
            <SubscriptionAllowancePanel allowances={allowances.data} />
        </div>
    );
}
