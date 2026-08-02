import type { InternalTask } from "@lab/protocol/task-queue/internal-task.types";
import { useQuery } from "@tanstack/react-query";
import { APP_FOOTER, APP_SHELL, DASHBOARD, PAGE_FRAME } from "#src/app.const";
import { CapabilitiesPanel } from "#src/capabilities/capabilities-panel";
import { ClaimsPanel } from "#src/claims/claims-panel";
import { ErrorDashboard } from "#src/connection-screen/error-screen";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { useDashboardView } from "#src/dashboard-view/dashboard-view";
import { DashboardView, VIEW_TABS } from "#src/dashboard-view/dashboard-view.const";
import { cn } from "#src/design-system/class-names";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#src/design-system/tabs";
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
import { TeamPanel } from "#src/team/team-panel";
import { useAgentActivity } from "#src/team/team-stream";

export function App() {
    const stream = useLiveStatus();
    const [view, selectView] = useDashboardView();
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
            <LabHeader
                snapshot={snapshot}
                stream={stream}
                showSections={view === DashboardView.OVERVIEW}
            />
            <Tabs value={view} onValueChange={selectView} className={cn(PAGE_FRAME, "pt-6")}>
                <TabsList>
                    {VIEW_TABS.map((tab) => (
                        <TabsTrigger key={tab.view} value={tab.view}>
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value={DashboardView.OVERVIEW} className={DASHBOARD}>
                    <MissionOverview snapshot={snapshot} />
                    <OutcomePanel snapshot={snapshot} />
                    <FrontierPanel frontier={snapshot.frontier} />
                    <CapabilitiesPanel requests={snapshot.capability_requests} />
                    <BranchesPanel
                        branches={snapshot.branches}
                        agents={snapshot.agents}
                        tasks={snapshot.tasks}
                    />
                    <ClaimsPanel claims={snapshot.claims} />
                    <ExperimentsPanel experiments={snapshot.experiments} />
                    <EventsPanel events={snapshot.recent_events} />
                </TabsContent>

                <TabsContent value={DashboardView.TEAM} className={DASHBOARD}>
                    <LiveTeam tasks={snapshot.tasks} />
                </TabsContent>
            </Tabs>
            <footer className={cn(PAGE_FRAME, APP_FOOTER)}>
                <span>AI Research Lab · Observer mode</span>
                <span>Control remains in the CLI</span>
            </footer>
        </div>
    );
}

/**
 * The stream lives inside the tab's own content, which an inactive tab does not render, so a lab
 * nobody is watching is never asked for frames.
 */
function LiveTeam({ tasks }: { tasks: InternalTask[] }) {
    const { agents } = useAgentActivity();
    return <TeamPanel agents={agents} tasks={tasks} />;
}
