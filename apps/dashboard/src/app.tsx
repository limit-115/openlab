import { useQuery } from "@tanstack/react-query";
import { fetchStatus, statusQueryKey } from "#src/api/status-client";
import { useLiveStatus } from "#src/api/use-live-status";
import { BranchesPanel } from "#src/components/branches-panel";
import { CapabilitiesPanel } from "#src/components/capabilities-panel";
import { ClaimsPanel } from "#src/components/claims-panel";
import { DashboardHeader } from "#src/components/dashboard-header";
import { ErrorDashboard, LoadingDashboard } from "#src/components/dashboard-state";
import { EventsPanel } from "#src/components/events-panel";
import { ExperimentsPanel } from "#src/components/experiments-panel";
import { FrontierPanel } from "#src/components/frontier-panel";
import { OutcomePanel } from "#src/components/outcome-panel";
import { Overview } from "#src/components/overview";

export function App() {
    const stream = useLiveStatus();
    const statusQuery = useQuery({
        queryKey: statusQueryKey,
        queryFn: ({ signal }) => fetchStatus(signal),
        retry: 2,
        staleTime: 5_000,
        refetchInterval: stream.state === "live" ? false : 10_000,
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
        <div className="app-shell">
            <DashboardHeader snapshot={snapshot} stream={stream} />
            <main className="dashboard">
                <Overview snapshot={snapshot} />
                <OutcomePanel snapshot={snapshot} />
                <FrontierPanel frontier={snapshot.frontier} />
                <div className="content-grid">
                    <div className="content-grid__main">
                        <BranchesPanel
                            branches={snapshot.branches}
                            agents={snapshot.agents}
                            tasks={snapshot.tasks}
                        />
                        <ClaimsPanel claims={snapshot.claims} />
                        <ExperimentsPanel experiments={snapshot.experiments} />
                    </div>
                    <aside className="content-grid__aside" aria-label="Blockers and activity">
                        <CapabilitiesPanel requests={snapshot.capability_requests} />
                        <EventsPanel events={snapshot.recent_events} />
                    </aside>
                </div>
            </main>
            <footer className="app-footer">
                <span>AI Research Lab · Observer mode</span>
                <span>Control remains in the CLI</span>
            </footer>
        </div>
    );
}
