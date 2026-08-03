import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router";
import { APP_FOOTER, APP_SHELL, DASHBOARD, PAGE_FRAME } from "#src/app.const";
import { ErrorDashboard } from "#src/connection-screen/error-screen";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { cn } from "#src/design-system/class-names";
import { LabHeader } from "#src/lab-header/lab-header";
import { fetchStatus, statusQueryKey } from "#src/live-status/status-client";
import { useLiveStatus } from "#src/live-status/status-stream";
import { StreamState } from "#src/live-status/status-stream.const";

/** The shell every view is shown in: it resolves the snapshot once and hands it to the route. */
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
            <main className={cn(PAGE_FRAME, DASHBOARD)}>
                <Outlet context={snapshot} />
            </main>
            <footer className={cn(PAGE_FRAME, APP_FOOTER)}>
                <span>AI Research Lab · Local runtime</span>
                <span>Lifecycle controls sit beside the state in the header</span>
            </footer>
        </div>
    );
}
