import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";

export function terminalTimestamps(snapshot: StatusSnapshot, updatedAt: Date) {
    switch (snapshot.lab.state) {
        case LabState.HIBERNATING:
            return { hibernatedAt: updatedAt };
        case LabState.BREAKTHROUGH:
            return { breakthroughAt: updatedAt };
        case LabState.STOPPED:
            return { stoppedAt: updatedAt };
        case LabState.RUNNING:
        case LabState.FAILED:
            return {};
    }
}
