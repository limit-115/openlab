import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { INVESTIGATION_VIEWS } from "#src/dashboard-routes/dashboard-routes.const";
import { TabsList, TabsTrigger } from "#src/design-system/tabs";
import { INVESTIGATION_HEADER_ROW } from "#src/investigation-header/investigation-header.const";
import { RuntimeStrip } from "#src/investigation-header/runtime-strip";
import type { LiveStatus } from "#src/live-status/status-stream.types";

interface InvestigationHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

/** Which view of the investigation to read, and how the investigation itself is running. */
export function InvestigationHeader({ snapshot, stream }: InvestigationHeaderProps) {
    return (
        <header className={INVESTIGATION_HEADER_ROW}>
            <TabsList>
                {INVESTIGATION_VIEWS.map((view) => (
                    <TabsTrigger key={view.view} value={view.view}>
                        {view.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            <RuntimeStrip snapshot={snapshot} stream={stream} />
        </header>
    );
}
