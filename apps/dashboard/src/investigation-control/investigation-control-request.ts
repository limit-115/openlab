import { StatusSnapshotSchema } from "@nightlab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@nightlab/protocol/investigation-status/status-snapshot.types";
import i18next from "i18next";
import {
    INVESTIGATION_CONTROL_TRANSITION,
    type InvestigationControlAction
} from "#src/investigation-control/investigation-control.const";
import { INVESTIGATION_CONTROL_NAMESPACE } from "#src/investigation-control/investigation-control.i18n";
import { investigationPath } from "#src/investigation-roster/investigation-address";

/**
 * Runs a lifecycle control and returns the snapshot the daemon settled on. A refusal keeps the
 * daemon's own wording, because it names the state that blocked the transition.
 */
export async function sendInvestigationControl(
    investigationId: string,
    action: InvestigationControlAction
): Promise<StatusSnapshot> {
    let response: Response;
    try {
        response = await fetch(
            `${investigationPath(investigationId)}/${INVESTIGATION_CONTROL_TRANSITION[action]}`,
            {
                method: "POST",
                headers: { Accept: "application/json" }
            }
        );
    } catch {
        throw new Error(i18next.t("unreachable", { ns: INVESTIGATION_CONTROL_NAMESPACE }));
    }

    const payload: unknown = await response.json();

    if (!response.ok) {
        throw new Error(
            refusal(payload) ??
                i18next.t("refused", {
                    ns: INVESTIGATION_CONTROL_NAMESPACE,
                    status: response.status
                })
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
