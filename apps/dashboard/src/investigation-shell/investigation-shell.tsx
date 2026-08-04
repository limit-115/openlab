import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { ErrorDashboard } from "#src/connection-screen/error-screen";
import { LoadingDashboard } from "#src/connection-screen/loading-screen";
import { InvestigationView } from "#src/dashboard-routes/dashboard-routes.const";
import { Tabs, TabsContent } from "#src/design-system/tabs";
import { InvestigationHeader } from "#src/investigation-header/investigation-header";
import {
    INVESTIGATION_DASHBOARD,
    INVESTIGATION_PAGE
} from "#src/investigation-shell/investigation-shell.const";
import { OverviewView } from "#src/investigation-shell/overview-view";
import { TeamView } from "#src/investigation-shell/team-view";
import { fetchStatus, statusQueryKey } from "#src/live-status/status-client";
import { useLiveStatus } from "#src/live-status/status-stream";
import { StreamState } from "#src/live-status/status-stream.const";

/**
 * Resolves one investigation's snapshot and hands it to whichever of its views is open. It is the
 * investigation's boundary, not a shell: the layout around it is the one every page opens in.
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
        <Tabs defaultValue={InvestigationView.OVERVIEW} className={INVESTIGATION_PAGE}>
            <InvestigationHeader snapshot={snapshot} stream={stream} />
            <TabsContent value={InvestigationView.OVERVIEW} className={INVESTIGATION_DASHBOARD}>
                <OverviewView snapshot={snapshot} />
            </TabsContent>
            <TabsContent value={InvestigationView.TEAM} className={INVESTIGATION_DASHBOARD}>
                <TeamView snapshot={snapshot} />
            </TabsContent>
        </Tabs>
    );
}
