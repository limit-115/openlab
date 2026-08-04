import type { RunDirectoryUsage } from "@lab/protocol/lab-storage/lab-storage.types";
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
    COPY_COLUMN_LABEL,
    DIRECTORY_CELL,
    DIRECTORY_COLUMN,
    DIRECTORY_COLUMN_LABEL,
    DIRECTORY_LINES,
    FILE_COUNT_CELL,
    FILE_COUNT_COLUMN_LABEL,
    NUMBER_COLUMN,
    RUN_DIRECTORY_COPY_LABEL,
    RUN_GOAL,
    RUN_PATH,
    RUN_TABLE,
    RUN_TABLE_LABEL,
    RUN_UNHELD_GOAL,
    SHARE_CELL,
    SHARE_COLUMN,
    SHARE_COLUMN_LABEL,
    SHARE_METER,
    SHARE_PERCENT,
    SHARE_READING,
    SIZE_CELL,
    SIZE_COLUMN_LABEL,
    UNHELD_RUN_LABEL
} from "#src/lab-maintenance/lab-maintenance.const";
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
    return (
        <Table className={RUN_TABLE} aria-label={RUN_TABLE_LABEL}>
            <TableHeader>
                <TableRow>
                    <TableHead className={DIRECTORY_COLUMN}>{DIRECTORY_COLUMN_LABEL}</TableHead>
                    <TableHead className={SHARE_COLUMN}>{SHARE_COLUMN_LABEL}</TableHead>
                    <TableHead className={NUMBER_COLUMN}>{SIZE_COLUMN_LABEL}</TableHead>
                    <TableHead className={NUMBER_COLUMN}>{FILE_COUNT_COLUMN_LABEL}</TableHead>
                    <TableHead className={ACTION_COLUMN}>
                        <span className="sr-only">{COPY_COLUMN_LABEL}</span>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {runDirectoryShares(runs, totalBytes).map(({ run, percent }) => (
                    <TableRow key={run.investigation_id}>
                        <TableCell className={DIRECTORY_CELL}>
                            <div className={DIRECTORY_LINES}>
                                <p className={run.goal === null ? RUN_UNHELD_GOAL : RUN_GOAL}>
                                    {run.goal ?? UNHELD_RUN_LABEL}
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
                                    aria-label={SHARE_COLUMN_LABEL}
                                />
                                <span className={SHARE_PERCENT}>{formatShare(percent)}</span>
                            </div>
                        </TableCell>
                        <TableCell className={SIZE_CELL}>{formatByteSize(run.bytes)}</TableCell>
                        <TableCell className={FILE_COUNT_CELL}>
                            {formatCount(run.file_count)}
                        </TableCell>
                        <TableCell className={ACTION_CELL}>
                            <CopyButton value={run.path} label={RUN_DIRECTORY_COPY_LABEL} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
