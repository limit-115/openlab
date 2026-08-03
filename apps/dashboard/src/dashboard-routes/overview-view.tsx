import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { useOutletContext } from "react-router";
import { AssumptionsPanel } from "#src/assumptions/assumptions-panel";
import { BreakthroughBanner } from "#src/breakthrough/breakthrough-banner";
import { CapabilitiesPanel } from "#src/capabilities/capabilities-panel";
import { EventsPanel } from "#src/events/events-panel";
import { OutcomePanel } from "#src/lab-outcome/outcome-panel";
import { MissionOverview } from "#src/mission-overview/mission-overview";
import { SubscriptionAllowancePanel } from "#src/subscription-allowance/subscription-allowance-panel";

export function OverviewView() {
    const snapshot = useOutletContext<StatusSnapshot>();

    return (
        <>
            <MissionOverview snapshot={snapshot} />
            <BreakthroughBanner snapshot={snapshot} />
            <OutcomePanel snapshot={snapshot} />
            <CapabilitiesPanel requests={snapshot.capability_requests} />
            <SubscriptionAllowancePanel />
            <AssumptionsPanel
                assumptions={snapshot.assumptions}
                findings={snapshot.findings}
                verdicts={snapshot.verdicts}
            />
            <EventsPanel events={snapshot.recent_events} />
        </>
    );
}
