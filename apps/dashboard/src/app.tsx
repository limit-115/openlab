import { useQuery } from "@tanstack/react-query";
import { Outlet, useParams } from "react-router";
import { APP_FOOTER, APP_SHELL, DASHBOARD, PAGE_FRAME } from "#src/app.const";
import { ErrorDashboard } from "#src/connection-screen/error-screen";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { cn } from "#src/design-system/class-names";
import { InvestigationControls } from "#src/investigation-control/investigation-controls";
import { InvestigationHeader } from "#src/investigation-header/investigation-header";
import { fetchStatus, statusQueryKey } from "#src/live-status/status-client";
import { useLiveStatus } from "#src/live-status/status-stream";
import { StreamState } from "#src/live-status/status-stream.const";

/**
 * The shell one investigation is shown in: it resolves that investigation's snapshot once and hands
 * it to whichever of its views is open.
 */
export function InvestigationShell() {
    const investigationId = useParams().id ?? "";
    const stream = useLiveStatus(investigationId);
    const statusQuery = useQuery({
        queryKey: statusQueryKey(investigationId),
        queryFn: ({ signal }) => fetchStatus(investigationId, signal),
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
            <InvestigationHeader snapshot={snapshot} stream={stream} />
            <main className={cn(PAGE_FRAME, DASHBOARD)}>
                <Outlet context={snapshot} />
            </main>
            <footer className={cn(PAGE_FRAME, APP_FOOTER)}>
                <span>AI Research Lab · Local runtime</span>
            </footer>
            <InvestigationControls
                investigationId={snapshot.investigation.id}
                state={snapshot.investigation.state}
            />
        </div>
    );
}
