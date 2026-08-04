import { useTranslation } from "react-i18next";
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
    type InvestigationControlAction
} from "#src/investigation-control/investigation-control.const";
import { INVESTIGATION_CONTROL_NAMESPACE } from "#src/investigation-control/investigation-control.i18n";

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
    const { t } = useTranslation(INVESTIGATION_CONTROL_NAMESPACE);
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
            {applying ? t(pendingLabel) : t(label)}
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
                    <AlertDialogTitle>{t(confirmation.title)}</AlertDialogTitle>
                    <AlertDialogDescription>{t(confirmation.consequence)}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("keepRunning")}</AlertDialogCancel>
                    <AlertDialogAction variant={tone} onClick={run}>
                        {t(confirmation.confirmLabel)}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
