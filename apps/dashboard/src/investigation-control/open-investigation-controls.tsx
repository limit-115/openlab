import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useMatch } from "react-router";
import { INVESTIGATION_ROUTE } from "#src/dashboard-routes/dashboard-routes.const";
import { InvestigationControls } from "#src/investigation-control/investigation-controls";
import { statusQueryKey } from "#src/live-status/status-client";

/**
 * The controls of whichever investigation is open, and nothing at all anywhere else. The page that
 * opened it holds its snapshot and the stream that keeps it current, so this reads the snapshot the
 * lab already has rather than asking the daemon for one of its own.
 */
export function OpenInvestigationControls() {
    const investigationId = useMatch(INVESTIGATION_ROUTE)?.params.id;
    const status = useQuery<StatusSnapshot>({
        queryKey: statusQueryKey(investigationId ?? ""),
        queryFn: skipToken
    });

    if (investigationId === undefined || status.data === undefined) {
        return null;
    }

    return (
        <InvestigationControls
            investigationId={investigationId}
            state={status.data.investigation.state}
        />
    );
}
