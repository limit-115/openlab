import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { Link, useLocation } from "react-router";
import {
    INVESTIGATION_VIEWS,
    investigationView
} from "#src/dashboard-routes/dashboard-routes.const";
import { Tabs, TabsList, TabsTrigger } from "#src/design-system/tabs";
import { INVESTIGATION_HEADER_ROW } from "#src/investigation-header/investigation-header.const";
import { RuntimeStrip } from "#src/investigation-header/runtime-strip";
import type { LiveStatus } from "#src/live-status/status-stream.types";

interface InvestigationHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

/** Which view of the investigation is open, and how the investigation itself is running. */
export function InvestigationHeader({ snapshot, stream }: InvestigationHeaderProps) {
    const { pathname } = useLocation();

    return (
        <header className={INVESTIGATION_HEADER_ROW}>
            <Tabs value={pathname} activationMode="manual">
                <TabsList>
                    {INVESTIGATION_VIEWS.map((view) => (
                        <TabsTrigger
                            key={view.label}
                            value={investigationView(snapshot.investigation.id, view.view)}
                            asChild
                        >
                            <Link to={investigationView(snapshot.investigation.id, view.view)}>
                                {view.label}
                            </Link>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <RuntimeStrip snapshot={snapshot} stream={stream} />
        </header>
    );
}
