import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { investigationView } from "#src/dashboard-routes/dashboard-routes.const";
import { Button } from "#src/design-system/button";
import { InvestigationCard } from "#src/investigation-roster/investigation-card";
import {
    EMPTY_ROSTER_DESCRIPTION,
    EMPTY_ROSTER_TITLE,
    NEW_INVESTIGATION_LABEL,
    ROSTER_DESCRIPTION,
    ROSTER_DESCRIPTION_TEXT,
    ROSTER_HEADER,
    ROSTER_LIST,
    ROSTER_PAGE,
    ROSTER_TITLE,
    ROSTER_TITLE_TEXT
} from "#src/investigation-roster/investigation-roster.const";
import {
    createInvestigation,
    discardInvestigation,
    fetchInvestigationRoster,
    investigationRosterQueryKey
} from "#src/investigation-roster/investigation-roster-client";
import { useLiveRoster } from "#src/investigation-roster/investigation-roster-stream";
import { NewInvestigationForm } from "#src/investigation-roster/new-investigation-form";
import { StreamState } from "#src/live-status/status-stream.const";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

/**
 * Everything the lab is investigating. The list is the lab's front door: one direction per card,
 * and the form that adds another.
 */
export function InvestigationRoster() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const stream = useLiveRoster();
    const [composing, setComposing] = useState(false);
    const roster = useQuery({
        queryKey: investigationRosterQueryKey,
        queryFn: ({ signal }) => fetchInvestigationRoster(signal),
        retry: 2,
        staleTime: 5_000,
        refetchInterval: stream.state === StreamState.LIVE ? false : 10_000
    });

    const start = useMutation({
        mutationFn: createInvestigation,
        onSuccess: async (snapshot) => {
            setComposing(false);
            await queryClient.invalidateQueries({ queryKey: investigationRosterQueryKey });
            await navigate(investigationView(snapshot.investigation.id));
        }
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
                <div className="grid gap-1">
                    <h1 className={ROSTER_TITLE_TEXT}>{ROSTER_TITLE}</h1>
                    <p className={ROSTER_DESCRIPTION_TEXT}>{ROSTER_DESCRIPTION}</p>
                </div>
                {composing ? null : (
                    <Button onClick={() => setComposing(true)}>{NEW_INVESTIGATION_LABEL}</Button>
                )}
            </header>

            {composing ? (
                <NewInvestigationForm
                    start={(investigation) => start.mutate(investigation)}
                    starting={start.isPending}
                    {...(start.error === null ? {} : { failure: start.error.message })}
                />
            ) : null}

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
