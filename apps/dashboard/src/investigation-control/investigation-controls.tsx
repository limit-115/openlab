import type { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    INVESTIGATION_CONTROL_ACTIONS,
    INVESTIGATION_CONTROL_FAILURE,
    INVESTIGATION_CONTROL_GROUP,
    INVESTIGATION_CONTROL_ORIGIN_STATES,
    InvestigationControlAction
} from "#src/investigation-control/investigation-control.const";
import { InvestigationControlButton } from "#src/investigation-control/investigation-control-button";
import { sendInvestigationControl } from "#src/investigation-control/investigation-control-request";
import { statusQueryKey } from "#src/live-status/status-client";

interface InvestigationControlsProps {
    investigationId: string;
    state: InvestigationState;
}

/**
 * The lifecycle controls, beside the views of the investigation they steer. Only the transitions the
 * current state allows are offered, so a failed run shows none at all and every other state carries
 * its way out of itself.
 */
export function InvestigationControls({ investigationId, state }: InvestigationControlsProps) {
    const queryClient = useQueryClient();
    const control = useMutation({
        mutationFn: (action: InvestigationControlAction) =>
            sendInvestigationControl(investigationId, action),
        onSuccess: (snapshot) => queryClient.setQueryData(statusQueryKey(investigationId), snapshot)
    });

    const offered = Object.values(InvestigationControlAction).filter((action) =>
        INVESTIGATION_CONTROL_ORIGIN_STATES[action].has(state)
    );

    if (offered.length === 0) {
        return null;
    }

    return (
        <div className={INVESTIGATION_CONTROL_GROUP}>
            <div className={INVESTIGATION_CONTROL_ACTIONS}>
                {offered.map((action) => (
                    <InvestigationControlButton
                        key={action}
                        action={action}
                        disabled={control.isPending}
                        applying={control.isPending && control.variables === action}
                        run={() => control.mutate(action)}
                    />
                ))}
            </div>
            {control.error ? (
                <p role="alert" className={INVESTIGATION_CONTROL_FAILURE}>
                    {control.error.message}
                </p>
            ) : null}
        </div>
    );
}
