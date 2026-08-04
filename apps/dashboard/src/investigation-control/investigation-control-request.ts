import { StatusSnapshotSchema } from "@lab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/investigation-status/status-snapshot.types";
import {
    INVESTIGATION_CONTROL_ENDPOINT,
    INVESTIGATION_CONTROL_UNREACHABLE,
    type InvestigationControlAction
} from "#src/investigation-control/investigation-control.const";

/**
 * Runs a lifecycle control and returns the snapshot the daemon settled on. A refusal keeps the
 * daemon's own wording, because it names the state that blocked the transition.
 */
export async function sendInvestigationControl(
    action: InvestigationControlAction
): Promise<StatusSnapshot> {
    let response: Response;
    try {
        response = await fetch(INVESTIGATION_CONTROL_ENDPOINT[action], {
            method: "POST",
            headers: { Accept: "application/json" }
        });
    } catch {
        throw new Error(INVESTIGATION_CONTROL_UNREACHABLE);
    }

    const payload: unknown = await response.json();

    if (!response.ok) {
        throw new Error(
            refusal(payload) ?? `The investigation refused the control with ${response.status}.`
        );
    }

    return StatusSnapshotSchema.parse(payload);
}

function refusal(payload: unknown): string | undefined {
    if (typeof payload === "object" && payload !== null && "error" in payload) {
        return String(payload.error);
    }
    return undefined;
}
