import { useQuery } from "@tanstack/react-query";
import {
    APP_FOOTER,
    APP_SHELL,
    CONTENT_GRID,
    CONTENT_GRID_ASIDE,
    CONTENT_GRID_MAIN,
    DASHBOARD
} from "#src/app.const";
import { CapabilitiesPanel } from "#src/capabilities/capabilities-panel";
import { ClaimsPanel } from "#src/claims/claims-panel";
import { ErrorDashboard } from "#src/connection-screen/error-screen";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { EventsPanel } from "#src/events/events-panel";
import { ExperimentsPanel } from "#src/experiments/experiments-panel";
import { LabHeader } from "#src/lab-header/lab-header";
import { OutcomePanel } from "#src/lab-outcome/outcome-panel";
import { fetchStatus, statusQueryKey } from "#src/live-status/status-client";
import { useLiveStatus } from "#src/live-status/status-stream";
import { StreamState } from "#src/live-status/status-stream.const";
import { MissionOverview } from "#src/mission-overview/mission-overview";
import { BranchesPanel } from "#src/research-branches/branches-panel";
import { FrontierPanel } from "#src/research-frontier/frontier-panel";

export function App() {
    const stream = useLiveStatus();
    const statusQuery = useQuery({
        queryKey: statusQueryKey,
        queryFn: ({ signal }) => fetchStatus(signal),
        retry: 2,
        staleTime: 5_000,
        refetchInterval: stream.state === StreamState.LIVE ? false : 10_000,
        refetchOnWindowFocus: true
    });

    if (!statusQuery.data && statusQuery.isPending) {
        return <LoadingDashboard />;
    }

    if (!statusQuery.data) {
        const error =
            statusQuery.error instanceof Error
                ? statusQuery.error
                : new Error("The local runtime did not return a status snapshot.");

        return (
            <ErrorDashboard
                error={error}
                retry={() => void statusQuery.refetch()}
                retrying={statusQuery.isFetching}
            />
        );
    }

    const snapshot = statusQuery.data;

    return (
        <div className={APP_SHELL}>
            <LabHeader snapshot={snapshot} stream={stream} />
            <main className={DASHBOARD}>
                <MissionOverview snapshot={snapshot} />
                <OutcomePanel snapshot={snapshot} />
                <FrontierPanel frontier={snapshot.frontier} />
                <div className={CONTENT_GRID}>
                    <div className={CONTENT_GRID_MAIN}>
                        <BranchesPanel
                            branches={snapshot.branches}
                            agents={snapshot.agents}
                            tasks={snapshot.tasks}
                        />
                        <ClaimsPanel claims={snapshot.claims} />
                        <ExperimentsPanel experiments={snapshot.experiments} />
                    </div>
                    <aside className={CONTENT_GRID_ASIDE} aria-label="Blockers">
                        <CapabilitiesPanel requests={snapshot.capability_requests} />
                    </aside>
                </div>
                <EventsPanel events={snapshot.recent_events} />
            </main>
            <footer className={APP_FOOTER}>
                <span>AI Research Lab · Observer mode</span>
                <span>Control remains in the CLI</span>
            </footer>
        </div>
    );
}
