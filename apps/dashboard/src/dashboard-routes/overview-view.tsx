import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { useOutletContext } from "react-router";
import { CapabilitiesPanel } from "#src/capabilities/capabilities-panel";
import { ClaimsPanel } from "#src/claims/claims-panel";
import { EventsPanel } from "#src/events/events-panel";
import { ExperimentsPanel } from "#src/experiments/experiments-panel";
import { OutcomePanel } from "#src/lab-outcome/outcome-panel";
import { MissionOverview } from "#src/mission-overview/mission-overview";
import { BranchesPanel } from "#src/research-branches/branches-panel";
import { FrontierPanel } from "#src/research-frontier/frontier-panel";

export function OverviewView() {
    const snapshot = useOutletContext<StatusSnapshot>();

    return (
        <>
            <MissionOverview snapshot={snapshot} />
            <OutcomePanel snapshot={snapshot} />
            <CapabilitiesPanel requests={snapshot.capability_requests} />
            <FrontierPanel frontier={snapshot.frontier} />
            <ClaimsPanel claims={snapshot.claims} experiments={snapshot.experiments} />
            <BranchesPanel
                branches={snapshot.branches}
                agents={snapshot.agents}
                tasks={snapshot.tasks}
            />
            <ExperimentsPanel experiments={snapshot.experiments} />
            <EventsPanel events={snapshot.recent_events} />
        </>
    );
}
