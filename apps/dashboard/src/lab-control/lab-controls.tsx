import type { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    LAB_CONTROL_COLUMN,
    LAB_CONTROL_FAILURE,
    LAB_CONTROL_GROUP,
    LAB_CONTROL_ORIGIN_STATES,
    LabControlAction
} from "#src/lab-control/lab-control.const";
import { LabControlButton } from "#src/lab-control/lab-control-button";
import { sendLabControl } from "#src/lab-control/lab-control-request";
import { statusQueryKey } from "#src/live-status/status-client";

interface LabControlsProps {
    state: LabState;
}

/**
 * The lifecycle controls beside the state readout. Only the transitions the current state allows are
 * offered, so a settled run shows none at all.
 */
export function LabControls({ state }: LabControlsProps) {
    const queryClient = useQueryClient();
    const control = useMutation({
        mutationFn: sendLabControl,
        onSuccess: (snapshot) => queryClient.setQueryData(statusQueryKey, snapshot)
    });

    const offered = Object.values(LabControlAction).filter((action) =>
        LAB_CONTROL_ORIGIN_STATES[action].has(state)
    );

    if (offered.length === 0) {
        return null;
    }

    return (
        <div className={LAB_CONTROL_COLUMN}>
            <div className={LAB_CONTROL_GROUP}>
                {offered.map((action) => (
                    <LabControlButton
                        key={action}
                        action={action}
                        disabled={control.isPending}
                        applying={control.isPending && control.variables === action}
                        run={() => control.mutate(action)}
                    />
                ))}
            </div>
            {control.error ? (
                <p role="alert" className={LAB_CONTROL_FAILURE}>
                    {control.error.message}
                </p>
            ) : null}
        </div>
    );
}
