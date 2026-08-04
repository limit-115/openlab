import type { LabStorage, RunDirectoryUsage } from "@lab/protocol/lab-storage/lab-storage.types";
import { HardDriveIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton } from "#src/clipboard/copy-button";
import { CardAction, CardHeader } from "#src/design-system/card";
import {
    RUN_COUNT_LABEL,
    STORAGE_ACTION,
    STORAGE_ROOT_ICON,
    STORAGE_ROOT_PATH,
    STORAGE_ROOT_ROW,
    STORAGE_STAT,
    STORAGE_STAT_LABEL,
    STORAGE_STAT_VALUE,
    STORAGE_STATS,
    STORAGE_SUMMARY,
    TOTAL_FILE_COUNT_LABEL,
    TOTAL_SIZE_LABEL,
    WORKSPACE_ROOT_COPY_LABEL
} from "#src/lab-maintenance/lab-maintenance.const";
import { formatByteSize } from "#src/value-display/byte-size";
import { formatCount } from "#src/value-display/count-display";

interface LabStorageSummaryProps {
    storage: LabStorage;
    /** What can be done about the reading, set against it in the corner of the card. */
    action?: ReactNode;
}

/**
 * The whole lab in three readings, over the one path they are all measured under. The size leads,
 * because it is the number that decides whether the operator does anything about it.
 */
export function LabStorageSummary({ storage, action }: LabStorageSummaryProps) {
    return (
        <CardHeader className={STORAGE_SUMMARY}>
            <div className={STORAGE_STATS}>
                <StorageStat label={TOTAL_SIZE_LABEL} reading={formatByteSize(storage.bytes)} />
                <StorageStat label={RUN_COUNT_LABEL} reading={formatCount(storage.runs.length)} />
                <StorageStat
                    label={TOTAL_FILE_COUNT_LABEL}
                    reading={formatCount(heldFileCount(storage.runs))}
                />
            </div>
            {action ? <CardAction className={STORAGE_ACTION}>{action}</CardAction> : null}
            <div className={STORAGE_ROOT_ROW}>
                <HardDriveIcon className={STORAGE_ROOT_ICON} aria-hidden="true" />
                <p className={STORAGE_ROOT_PATH}>{storage.workspace_root}</p>
                <CopyButton value={storage.workspace_root} label={WORKSPACE_ROOT_COPY_LABEL} />
            </div>
        </CardHeader>
    );
}

interface StorageStatProps {
    label: string;
    reading: string;
}

function StorageStat({ label, reading }: StorageStatProps) {
    return (
        <div className={STORAGE_STAT}>
            <p className={STORAGE_STAT_LABEL}>{label}</p>
            <p className={STORAGE_STAT_VALUE}>{reading}</p>
        </div>
    );
}

function heldFileCount(runs: readonly RunDirectoryUsage[]): number {
    return runs.reduce((total, run) => total + run.file_count, 0);
}
