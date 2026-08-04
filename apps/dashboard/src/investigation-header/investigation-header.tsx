import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import { useTranslation } from "react-i18next";
import { INVESTIGATION_VIEWS } from "#src/dashboard-routes/dashboard-routes.const";
import { TabsList, TabsTrigger } from "#src/design-system/tabs";
import { InvestigationControls } from "#src/investigation-control/investigation-controls";
import {
    INVESTIGATION_HEADER_ROW,
    INVESTIGATION_HEADER_VIEWS
} from "#src/investigation-header/investigation-header.const";
import { INVESTIGATION_HEADER_NAMESPACE } from "#src/investigation-header/investigation-header.i18n";
import { RuntimeStrip } from "#src/investigation-header/runtime-strip";
import type { LiveStatus } from "#src/live-status/status-stream.types";

interface InvestigationHeaderProps {
    snapshot: StatusSnapshot;
    stream: LiveStatus;
}

/**
 * Which view of the investigation to read, what can be done to the run behind it, and how the
 * investigation itself is running.
 */
export function InvestigationHeader({ snapshot, stream }: InvestigationHeaderProps) {
    const { t } = useTranslation(INVESTIGATION_HEADER_NAMESPACE);

    return (
        <header className={INVESTIGATION_HEADER_ROW}>
            <div className={INVESTIGATION_HEADER_VIEWS}>
                <TabsList>
                    {INVESTIGATION_VIEWS.map((view) => (
                        <TabsTrigger key={view} value={view}>
                            {t(view)}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <InvestigationControls
                    investigationId={snapshot.investigation.id}
                    state={snapshot.investigation.state}
                />
            </div>

            <RuntimeStrip snapshot={snapshot} stream={stream} />
        </header>
    );
}
