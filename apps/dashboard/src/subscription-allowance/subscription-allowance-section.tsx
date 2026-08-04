import type { SubscriptionAllowanceRoster } from "@lab/protocol/subscription-allowance/subscription-allowance.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId } from "react";
import { Spinner } from "#src/design-system/spinner";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import { AllowanceReadingHeader } from "#src/subscription-allowance/allowance-reading-header";
import { allowanceReadingTime } from "#src/subscription-allowance/allowance-reading-time";
import {
    fetchSubscriptionAllowance,
    refreshSubscriptionAllowance,
    subscriptionAllowanceQueryKey
} from "#src/subscription-allowance/subscription-allowance-client";
import { SubscriptionAllowanceList } from "#src/subscription-allowance/subscription-allowance-list";
import {
    ALLOWANCE_READING_PENDING,
    ALLOWANCE_REFETCH_MILLISECONDS,
    ALLOWANCE_SECTION,
    ALLOWANCE_SECTION_TITLE,
    ALLOWANCE_SECTION_TITLE_TEXT,
    NO_ALLOWANCE_DESCRIPTION,
    NO_ALLOWANCE_TITLE,
    READING_PENDING_LABEL
} from "#src/subscription-allowance/subscription-allowance-section.const";

/**
 * What every subscription the lab can run on has left. Only this block reads them, so the vendors
 * are asked while somebody is looking at the numbers, and it keeps its heading through the first
 * reading and through a runtime that does not serve them at all.
 */
export function SubscriptionAllowanceSection() {
    const headingId = useId();
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

    return (
        <section className={ALLOWANCE_SECTION} aria-labelledby={headingId}>
            <h1 id={headingId} className={ALLOWANCE_SECTION_TITLE_TEXT}>
                {ALLOWANCE_SECTION_TITLE}
            </h1>
            <AllowanceReadings
                allowances={allowances.data}
                pending={allowances.isPending}
                refresh={() => refresh.mutate()}
                reading={refresh.isPending || allowances.isFetching}
                failed={refresh.isError}
            />
        </section>
    );
}

interface AllowanceReadingsProps {
    allowances: SubscriptionAllowanceRoster | undefined;
    /** The first reading is still on its way, so there is nothing to show yet rather than nothing. */
    pending: boolean;
    refresh: () => void;
    reading: boolean;
    failed: boolean;
}

/**
 * An operator who came here for the numbers is owed the reason there are none, so a runtime that
 * does not serve the readings says so outright instead of leaving the block empty.
 */
function AllowanceReadings({
    allowances,
    pending,
    refresh,
    reading,
    failed
}: AllowanceReadingsProps) {
    if (allowances === undefined) {
        return pending ? (
            <p className={ALLOWANCE_READING_PENDING}>
                <Spinner />
                {READING_PENDING_LABEL}
            </p>
        ) : (
            <PanelEmptyState title={NO_ALLOWANCE_TITLE} description={NO_ALLOWANCE_DESCRIPTION} />
        );
    }

    return (
        <>
            <AllowanceReadingHeader
                readAt={allowanceReadingTime(allowances)}
                refresh={refresh}
                reading={reading}
                failed={failed}
            />
            <SubscriptionAllowanceList allowances={allowances} />
        </>
    );
}
