import type { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from "#src/design-system/sidebar";
import {
    INVESTIGATION_CONTROL_FAILURE,
    INVESTIGATION_CONTROL_LABEL,
    INVESTIGATION_CONTROL_ORIGIN_STATES,
    InvestigationControlAction
} from "#src/investigation-control/investigation-control.const";
import { InvestigationControlEntry } from "#src/investigation-control/investigation-control-entry";
import { sendInvestigationControl } from "#src/investigation-control/investigation-control-request";
import { statusQueryKey } from "#src/live-status/status-client";

interface InvestigationControlsProps {
    investigationId: string;
    state: InvestigationState;
}

/**
 * The lifecycle controls, standing with the lab's other entries rather than over the page. Only the
 * transitions the current state allows are offered, so a failed run shows nothing at all and every
 * other state carries its way out of itself.
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
        // The shelf the group stands on already holds it off the sidebar's edge.
        <SidebarGroup className="p-0">
            <SidebarGroupLabel>{INVESTIGATION_CONTROL_LABEL}</SidebarGroupLabel>
            <SidebarMenu aria-label={INVESTIGATION_CONTROL_LABEL}>
                {offered.map((action) => (
                    <InvestigationControlEntry
                        key={action}
                        action={action}
                        disabled={control.isPending}
                        applying={control.isPending && control.variables === action}
                        run={() => control.mutate(action)}
                    />
                ))}
            </SidebarMenu>
            {control.error ? (
                <p role="alert" className={INVESTIGATION_CONTROL_FAILURE}>
                    {control.error.message}
                </p>
            ) : null}
        </SidebarGroup>
    );
}
