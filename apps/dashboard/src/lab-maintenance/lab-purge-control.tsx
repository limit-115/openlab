import { Trash2Icon } from "lucide-react";
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
import { LAB_MAINTENANCE_NAMESPACE } from "#src/lab-maintenance/lab-maintenance.i18n";

interface LabPurgeControlProps {
    purging: boolean;
    purge: () => void;
}

/** Emptying the lab cannot be undone, so it asks before it reaches the daemon. */
export function LabPurgeControl({ purging, purge }: LabPurgeControlProps) {
    const { t } = useTranslation(LAB_MAINTENANCE_NAMESPACE);
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" disabled={purging}>
                    {purging ? <Spinner aria-hidden="true" /> : <Trash2Icon />}
                    {purging ? t("purging") : t("purge")}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("purgeTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("purgeConsequence")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("purgeCancel")}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={purge}>
                        {t("purgeConfirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
