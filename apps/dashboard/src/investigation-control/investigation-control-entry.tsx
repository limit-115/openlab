import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "#src/design-system/alert-dialog";
import { SidebarMenuButton, SidebarMenuItem } from "#src/design-system/sidebar";
import { Spinner } from "#src/design-system/spinner";
import {
    INVESTIGATION_CONTROL_PRESENTATION,
    INVESTIGATION_CONTROL_TONE,
    type InvestigationControlAction,
    KEEP_RUN_LABEL
} from "#src/investigation-control/investigation-control.const";

interface InvestigationControlEntryProps {
    action: InvestigationControlAction;
    /** Every control is held while one is in flight, so two transitions cannot race each other. */
    disabled: boolean;
    /** This is the control the daemon is currently applying. */
    applying: boolean;
    run: () => void;
}

/** One lifecycle control. A control the operator cannot undo asks before it reaches the daemon. */
export function InvestigationControlEntry({
    action,
    disabled,
    applying,
    run
}: InvestigationControlEntryProps) {
    const {
        label,
        pendingLabel,
        icon: Icon,
        tone,
        confirmation
    } = INVESTIGATION_CONTROL_PRESENTATION[action];

    const control = (
        <SidebarMenuButton
            className={INVESTIGATION_CONTROL_TONE[tone]}
            disabled={disabled}
            {...(confirmation === undefined ? { onClick: run } : {})}
        >
            {applying ? <Spinner aria-hidden="true" /> : <Icon />}
            <span>{applying ? pendingLabel : label}</span>
        </SidebarMenuButton>
    );

    return (
        <SidebarMenuItem>
            {confirmation === undefined ? (
                control
            ) : (
                <AlertDialog>
                    <AlertDialogTrigger asChild>{control}</AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {confirmation.consequence}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{KEEP_RUN_LABEL}</AlertDialogCancel>
                            {/* A control only ever asks when the run cannot be brought back. */}
                            <AlertDialogAction variant="destructive" onClick={run}>
                                {confirmation.confirmLabel}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </SidebarMenuItem>
    );
}
