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
import { Button } from "#src/design-system/button";
import { Spinner } from "#src/design-system/spinner";
import {
    INVESTIGATION_CONTROL_PRESENTATION,
    type InvestigationControlAction,
    KEEP_RUN_LABEL
} from "#src/investigation-control/investigation-control.const";

interface InvestigationControlButtonProps {
    action: InvestigationControlAction;
    /** Every control is held while one is in flight, so two transitions cannot race each other. */
    disabled: boolean;
    /** This is the control the daemon is currently applying. */
    applying: boolean;
    run: () => void;
}

/** One lifecycle control. A control the operator cannot undo asks before it reaches the daemon. */
export function InvestigationControlButton({
    action,
    disabled,
    applying,
    run
}: InvestigationControlButtonProps) {
    const {
        label,
        pendingLabel,
        icon: Icon,
        tone,
        confirmation
    } = INVESTIGATION_CONTROL_PRESENTATION[action];

    const control = (
        <Button
            type="button"
            variant={tone}
            size="sm"
            disabled={disabled}
            {...(confirmation === undefined ? { onClick: run } : {})}
        >
            {applying ? <Spinner aria-hidden="true" /> : <Icon />}
            {applying ? pendingLabel : label}
        </Button>
    );

    if (confirmation === undefined) {
        return control;
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{control}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
                    <AlertDialogDescription>{confirmation.consequence}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{KEEP_RUN_LABEL}</AlertDialogCancel>
                    <AlertDialogAction variant={tone} onClick={run}>
                        {confirmation.confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
