import type { LabStorage } from "@nightlab/protocol/lab-storage/lab-storage.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "#src/design-system/card";
import { cn } from "#src/design-system/class-names";
import { Spinner } from "#src/design-system/spinner";
import {
    STORAGE_CARD,
    STORAGE_CARD_LISTING,
    STORAGE_DIRECTORIES,
    STORAGE_FAILURE,
    STORAGE_PENDING
} from "#src/lab-maintenance/lab-maintenance.const";
import { LAB_MAINTENANCE_NAMESPACE } from "#src/lab-maintenance/lab-maintenance.i18n";
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
    const { t } = useTranslation(LAB_MAINTENANCE_NAMESPACE);
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
        <Panel title={t("title")} description={t("description")}>
            {purge.isError ? (
                <p role="alert" className={STORAGE_FAILURE}>
                    {t("purgeFailure")}
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
    const { t } = useTranslation(LAB_MAINTENANCE_NAMESPACE);

    if (storage === undefined) {
        return pending ? (
            <p className={STORAGE_PENDING}>
                <Spinner />
                {t("pending")}
            </p>
        ) : (
            <PanelEmptyState
                title={t("unsupportedTitle")}
                description={t("unsupportedDescription")}
            />
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
                    title={t("emptyTitle")}
                    description={t("emptyDescription")}
                    compact
                />
            ) : null}
        </>
    );
}
