import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { InvestigationCard } from "#src/investigation-roster/investigation-card";
import {
    EMPTY_ROSTER_DESCRIPTION,
    EMPTY_ROSTER_TITLE,
    ROSTER_DESCRIPTION,
    ROSTER_DESCRIPTION_TEXT,
    ROSTER_HEADER,
    ROSTER_LIST,
    ROSTER_PAGE,
    ROSTER_TITLE,
    ROSTER_TITLE_TEXT
} from "#src/investigation-roster/investigation-roster.const";
import {
    discardInvestigation,
    fetchInvestigationRoster,
    investigationRosterQueryKey
} from "#src/investigation-roster/investigation-roster-client";
import { useLiveRoster } from "#src/investigation-roster/investigation-roster-stream";
import { StreamState } from "#src/live-status/status-stream.const";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

/** Everything the lab is investigating, one direction per card. */
export function InvestigationRoster() {
    const queryClient = useQueryClient();
    const stream = useLiveRoster();
    const roster = useQuery({
        queryKey: investigationRosterQueryKey,
        queryFn: ({ signal }) => fetchInvestigationRoster(signal),
        retry: 2,
        staleTime: 5_000,
        refetchInterval: stream.state === StreamState.LIVE ? false : 10_000
    });

    const discard = useMutation({
        mutationFn: discardInvestigation,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: investigationRosterQueryKey })
    });

    if (roster.data === undefined && roster.isPending) {
        return <LoadingDashboard />;
    }

    const investigations = roster.data ?? [];

    return (
        <div className={ROSTER_PAGE}>
            <header className={ROSTER_HEADER}>
                <h1 className={ROSTER_TITLE_TEXT}>{ROSTER_TITLE}</h1>
                <p className={ROSTER_DESCRIPTION_TEXT}>{ROSTER_DESCRIPTION}</p>
            </header>

            {investigations.length === 0 ? (
                <PanelEmptyState
                    title={EMPTY_ROSTER_TITLE}
                    description={EMPTY_ROSTER_DESCRIPTION}
                />
            ) : (
                <ul className={ROSTER_LIST} aria-label={ROSTER_TITLE}>
                    {investigations.map((investigation) => (
                        <li key={investigation.id}>
                            <InvestigationCard
                                investigation={investigation}
                                discard={() => discard.mutate(investigation.id)}
                                discarding={
                                    discard.isPending && discard.variables === investigation.id
                                }
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
