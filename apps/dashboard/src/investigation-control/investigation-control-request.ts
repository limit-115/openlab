import { StatusSnapshotSchema } from "@lab/protocol/lab-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import {
    LAB_CONTROL_ENDPOINT,
    LAB_CONTROL_UNREACHABLE,
    type LabControlAction
} from "#src/lab-control/lab-control.const";

/**
 * Runs a lifecycle control and returns the snapshot the daemon settled on. A refusal keeps the
 * daemon's own wording, because it names the state that blocked the transition.
 */
export async function sendLabControl(action: LabControlAction): Promise<StatusSnapshot> {
    let response: Response;
    try {
        response = await fetch(LAB_CONTROL_ENDPOINT[action], {
            method: "POST",
            headers: { Accept: "application/json" }
        });
    } catch {
        throw new Error(LAB_CONTROL_UNREACHABLE);
    }

    const payload: unknown = await response.json();

    if (!response.ok) {
        throw new Error(refusal(payload) ?? `The lab refused the control with ${response.status}.`);
    }

    return StatusSnapshotSchema.parse(payload);
}

function refusal(payload: unknown): string | undefined {
    if (typeof payload === "object" && payload !== null && "error" in payload) {
        return String(payload.error);
    }
    return undefined;
}
