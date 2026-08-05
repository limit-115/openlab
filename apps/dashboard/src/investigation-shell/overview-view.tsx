import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { AssumptionsPanel } from "#src/assumptions/assumptions-panel";
import { BreakthroughBanner } from "#src/breakthrough/breakthrough-banner";
import { CapabilitiesPanel } from "#src/capabilities/capabilities-panel";
import { EventsPanel } from "#src/events/events-panel";
import { DispatchPanel } from "#src/investigation-dispatch/dispatch-panel";
import { OutcomePanel } from "#src/investigation-outcome/outcome-panel";
import { MissionOverview } from "#src/mission-overview/mission-overview";

export function OverviewView({ snapshot }: { snapshot: StatusSnapshot }) {
    return (
        <>
            <MissionOverview snapshot={snapshot} />
            <BreakthroughBanner snapshot={snapshot} />
            <OutcomePanel snapshot={snapshot} />
            <CapabilitiesPanel
                investigationId={snapshot.investigation.id}
                requests={snapshot.capability_requests}
            />
            <DispatchPanel investigationId={snapshot.investigation.id} />
            <AssumptionsPanel
                assumptions={snapshot.assumptions}
                findings={snapshot.findings}
                verdicts={snapshot.verdicts}
            />
            <EventsPanel events={snapshot.recent_events} />
        </>
    );
}
