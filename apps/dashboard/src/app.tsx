import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, useLocation } from "react-router";
import { APP_FOOTER, APP_SHELL, DASHBOARD, PAGE_FRAME } from "#src/app.const";
import { ErrorDashboard } from "#src/connection-screen/error-screen";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { DashboardRoute, VIEW_TABS } from "#src/dashboard-routes/dashboard-routes.const";
import { cn } from "#src/design-system/class-names";
import { Tabs, TabsList, TabsTrigger } from "#src/design-system/tabs";
import { LabHeader } from "#src/lab-header/lab-header";
import { fetchStatus, statusQueryKey } from "#src/live-status/status-client";
import { useLiveStatus } from "#src/live-status/status-stream";
import { StreamState } from "#src/live-status/status-stream.const";

/** The shell every view is shown in: it resolves the snapshot once and hands it to the route. */
export function App() {
    const stream = useLiveStatus();
    const { pathname } = useLocation();
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
                showSections={pathname === DashboardRoute.OVERVIEW}
            />
            <Tabs value={pathname} className={cn(PAGE_FRAME, "pt-6")}>
                <TabsList>
                    {VIEW_TABS.map((tab) => (
                        <TabsTrigger key={tab.route} value={tab.route} asChild>
                            <Link to={tab.route}>{tab.label}</Link>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className={DASHBOARD}>
                    <Outlet context={snapshot} />
                </div>
            </Tabs>
            <footer className={cn(PAGE_FRAME, APP_FOOTER)}>
                <span>AI Research Lab · Observer mode</span>
                <span>Control remains in the CLI</span>
            </footer>
        </div>
    );
}
