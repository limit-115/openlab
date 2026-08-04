import type { LabStorage } from "@lab/protocol/lab-storage/lab-storage.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    EMPTY_LAB_DESCRIPTION,
    EMPTY_LAB_TITLE,
    NO_STORAGE_DESCRIPTION,
    NO_STORAGE_TITLE,
    PURGE_CANCEL_LABEL,
    PURGE_CONFIRM_LABEL,
    PURGE_CONSEQUENCE,
    PURGE_FAILURE_LABEL,
    PURGE_LABEL,
    PURGE_TITLE,
    PURGING_LABEL,
    STORAGE_DESCRIPTION,
    STORAGE_FAILURE,
    STORAGE_PENDING,
    STORAGE_PENDING_LABEL,
    STORAGE_ROOT,
    STORAGE_TITLE,
    STORAGE_TOTAL,
    STORAGE_TOTAL_SIZE
} from "#src/lab-maintenance/lab-maintenance.const";
import {
    fetchLabStorage,
    labStorageQueryKey,
    purgeLabStorage
} from "#src/lab-maintenance/lab-maintenance-client";
import { RunDirectoryList } from "#src/lab-maintenance/run-directory-list";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";
import { formatByteSize } from "#src/value-display/byte-size";

/**
 * What the lab is taking up, and the one control that gives it back. The reading is re-read after a
 * purge from the answer the daemon gives, so the page never claims space that is already free.
 */
export function LabStorageSection() {
    const queryClient = useQueryClient();
    const storage = useQuery({
        queryKey: labStorageQueryKey,
        queryFn: ({ signal }) => fetchLabStorage(signal),
        retry: false
    });

    const purge = useMutation({
        mutationFn: () => purgeLabStorage(),
        onSuccess: (purged) => queryClient.setQueryData(labStorageQueryKey, purged)
    });

    return (
        <Panel
            title={STORAGE_TITLE}
            description={STORAGE_DESCRIPTION}
            action={
                storage.data === undefined ? null : (
                    <PurgeControl purging={purge.isPending} purge={() => purge.mutate()} />
                )
            }
        >
            {purge.isError ? (
                <p role="alert" className={STORAGE_FAILURE}>
                    {PURGE_FAILURE_LABEL}
                </p>
            ) : null}
            <StorageReading storage={storage.data} pending={storage.isPending} />
        </Panel>
    );
}

interface StorageReadingProps {
    storage: LabStorage | undefined;
    pending: boolean;
}

function StorageReading({ storage, pending }: StorageReadingProps) {
    if (storage === undefined) {
        return pending ? (
            <p className={STORAGE_PENDING}>
                <Spinner />
                {STORAGE_PENDING_LABEL}
            </p>
        ) : (
            <PanelEmptyState title={NO_STORAGE_TITLE} description={NO_STORAGE_DESCRIPTION} />
        );
    }

    return (
        <>
            <div className={STORAGE_TOTAL}>
                <p className={STORAGE_TOTAL_SIZE}>{formatByteSize(storage.bytes)}</p>
                <p className={STORAGE_ROOT}>{storage.workspace_root}</p>
            </div>
            {storage.runs.length === 0 ? (
                <PanelEmptyState
                    title={EMPTY_LAB_TITLE}
                    description={EMPTY_LAB_DESCRIPTION}
                    compact
                />
            ) : (
                <RunDirectoryList runs={storage.runs} />
            )}
        </>
    );
}

interface PurgeControlProps {
    purging: boolean;
    purge: () => void;
}

/** Emptying the lab cannot be undone, so it asks before it reaches the daemon. */
function PurgeControl({ purging, purge }: PurgeControlProps) {
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
