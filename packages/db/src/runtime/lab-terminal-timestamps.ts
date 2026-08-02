import { LabState } from "@lab/protocol/constants";
import type { StatusSnapshot } from "@lab/protocol/status";

export function terminalTimestamps(snapshot: StatusSnapshot, updatedAt: Date) {
    switch (snapshot.lab.state) {
        case LabState.HIBERNATING:
            return { hibernatedAt: updatedAt };
        case LabState.COMPLETED:
            return { completedAt: updatedAt };
        case LabState.STOPPED:
            return { stoppedAt: updatedAt };
        case LabState.RUNNING:
        case LabState.FAILED:
            return {};
    }
}
