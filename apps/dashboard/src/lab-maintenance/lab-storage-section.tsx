import type { LabStorage } from "@lab/protocol/lab-storage/lab-storage.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "#src/design-system/card";
import { cn } from "#src/design-system/class-names";
import { Spinner } from "#src/design-system/spinner";
import {
    EMPTY_LAB_DESCRIPTION,
    EMPTY_LAB_TITLE,
    NO_STORAGE_DESCRIPTION,
    NO_STORAGE_TITLE,
    PURGE_FAILURE_LABEL,
    STORAGE_CARD,
    STORAGE_CARD_LISTING,
    STORAGE_DESCRIPTION,
    STORAGE_DIRECTORIES,
    STORAGE_FAILURE,
    STORAGE_PENDING,
    STORAGE_PENDING_LABEL,
    STORAGE_TITLE
} from "#src/lab-maintenance/lab-maintenance.const";
import {
    fetchLabStorage,
    labStorageQueryKey,
    purgeLabStorage
} from "#src/lab-maintenance/lab-maintenance-client";
import { LabPurgeControl } from "#src/lab-maintenance/lab-purge-control";
import { LabStorageSummary } from "#src/lab-maintenance/lab-storage-summary";
import { RunDirectoryTable } from "#src/lab-maintenance/run-directory-table";
import { Panel } from "#src/panel/panel";
import { PanelEmptyState } from "#src/panel/panel-empty-state";

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
        <Panel title={STORAGE_TITLE} description={STORAGE_DESCRIPTION}>
            {purge.isError ? (
                <p role="alert" className={STORAGE_FAILURE}>
                    {PURGE_FAILURE_LABEL}
                </p>
            ) : null}
            <StorageReading
                storage={storage.data}
                pending={storage.isPending}
                purging={purge.isPending}
                purge={() => purge.mutate()}
            />
        </Panel>
    );
}

interface StorageReadingProps {
    storage: LabStorage | undefined;
    pending: boolean;
    purging: boolean;
    purge: () => void;
}

function StorageReading({ storage, pending, purging, purge }: StorageReadingProps) {
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
            <Card className={cn(STORAGE_CARD, storage.runs.length > 0 && STORAGE_CARD_LISTING)}>
                <LabStorageSummary
                    storage={storage}
                    action={<LabPurgeControl purging={purging} purge={purge} />}
                />
                {storage.runs.length === 0 ? null : (
                    <CardContent className={STORAGE_DIRECTORIES}>
                        <RunDirectoryTable runs={storage.runs} totalBytes={storage.bytes} />
                    </CardContent>
                )}
            </Card>
            {storage.runs.length === 0 ? (
                <PanelEmptyState
                    title={EMPTY_LAB_TITLE}
                    description={EMPTY_LAB_DESCRIPTION}
                    compact
                />
            ) : null}
        </>
    );
}
