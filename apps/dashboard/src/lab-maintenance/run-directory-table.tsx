import type { RunDirectoryUsage } from "@openlab/protocol/lab-storage/lab-storage.types";
import { useTranslation } from "react-i18next";
import { CopyButton } from "#src/clipboard/copy-button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "#src/design-system/table";
import {
    ACTION_CELL,
    ACTION_COLUMN,
    DIRECTORY_CELL,
    DIRECTORY_COLUMN,
    DIRECTORY_LINES,
    FILE_COUNT_CELL,
    NUMBER_COLUMN,
    RUN_GOAL,
    RUN_PATH,
    RUN_TABLE,
    RUN_UNHELD_GOAL,
    SHARE_CELL,
    SHARE_COLUMN,
    SHARE_METER,
    SHARE_PERCENT,
    SHARE_READING,
    SIZE_CELL
} from "#src/lab-maintenance/lab-maintenance.const";
import { LAB_MAINTENANCE_NAMESPACE } from "#src/lab-maintenance/lab-maintenance.i18n";
import {
    formatShare,
    runDirectoryShares,
    WHOLE_SHARE
} from "#src/lab-maintenance/run-directory-share";
import { formatByteSize } from "#src/value-display/byte-size";
import { formatCount } from "#src/value-display/count-display";

interface RunDirectoryTableProps {
    runs: readonly RunDirectoryUsage[];
    /** What the lab holds in all, which every directory is metered against. */
    totalBytes: number;
}

/**
 * Every run directory on disk, heaviest first, each metered against the lab's total. The path is
 * shown whole and stays copyable, because it is what an operator hands to whatever reads the
 * artifacts next.
 */
export function RunDirectoryTable({ runs, totalBytes }: RunDirectoryTableProps) {
    const { t } = useTranslation(LAB_MAINTENANCE_NAMESPACE);
    return (
        <Table className={RUN_TABLE} aria-label={t("runTable")}>
            <TableHeader>
                <TableRow>
                    <TableHead className={DIRECTORY_COLUMN}>{t("directoryColumn")}</TableHead>
                    <TableHead className={SHARE_COLUMN}>{t("shareColumn")}</TableHead>
                    <TableHead className={NUMBER_COLUMN}>{t("sizeColumn")}</TableHead>
                    <TableHead className={NUMBER_COLUMN}>{t("fileCountColumn")}</TableHead>
                    <TableHead className={ACTION_COLUMN}>
                        <span className="sr-only">{t("copyColumn")}</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {runDirectoryShares(runs, totalBytes).map(({ run, percent }) => (
                    <TableRow key={run.investigation_id}>
                        <TableCell className={DIRECTORY_CELL}>
                            <div className={DIRECTORY_LINES}>
                                <p className={run.goal === null ? RUN_UNHELD_GOAL : RUN_GOAL}>
                                    {run.goal ?? t("unheldRun")}
                                </p>
                                <p className={RUN_PATH}>{run.path}</p>
                            </div>
                        </TableCell>
                        <TableCell className={SHARE_CELL}>
                            <div className={SHARE_READING}>
                                <progress
                                    className={SHARE_METER}
                                    value={percent}
                                    max={WHOLE_SHARE}
                                    aria-label={t("shareColumn")}
                                />
                                <span className={SHARE_PERCENT}>{formatShare(percent)}</span>
                            </div>
                        </TableCell>
                        <TableCell className={SIZE_CELL}>{formatByteSize(run.bytes)}</TableCell>
                        <TableCell className={FILE_COUNT_CELL}>
                            {formatCount(run.file_count)}
                        </TableCell>
                        <TableCell className={ACTION_CELL}>
                            <CopyButton value={run.path} label={t("copyRunDirectory")} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
