import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";

export function terminalTimestamps(snapshot: StatusSnapshot, updatedAt: Date) {
    switch (snapshot.investigation.state) {
        case InvestigationState.HIBERNATING:
            return { hibernatedAt: updatedAt };
        case InvestigationState.BREAKTHROUGH:
            return { breakthroughAt: updatedAt };
        case InvestigationState.STOPPED:
            return { stoppedAt: updatedAt };
        case InvestigationState.RUNNING:
        case InvestigationState.FAILED:
            return {};
    }
}
