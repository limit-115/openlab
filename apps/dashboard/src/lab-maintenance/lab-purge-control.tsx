import { Trash2Icon } from "lucide-react";
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
    PURGE_CANCEL_LABEL,
    PURGE_CONFIRM_LABEL,
    PURGE_CONSEQUENCE,
    PURGE_LABEL,
    PURGE_TITLE,
    PURGING_LABEL
} from "#src/lab-maintenance/lab-maintenance.const";

interface LabPurgeControlProps {
    purging: boolean;
    purge: () => void;
}

/** Emptying the lab cannot be undone, so it asks before it reaches the daemon. */
export function LabPurgeControl({ purging, purge }: LabPurgeControlProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" disabled={purging}>
                    {purging ? <Spinner aria-hidden="true" /> : <Trash2Icon />}
                    {purging ? PURGING_LABEL : PURGE_LABEL}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{PURGE_TITLE}</AlertDialogTitle>
                    <AlertDialogDescription>{PURGE_CONSEQUENCE}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{PURGE_CANCEL_LABEL}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={purge}>
                        {PURGE_CONFIRM_LABEL}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
