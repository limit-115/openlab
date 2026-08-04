import type { RunDirectoryUsage } from "@lab/protocol/lab-storage/lab-storage.types";
import { CopyButton } from "#src/clipboard/copy-button";
import {
    FILE_COUNT_LABEL,
    RUN_CARD,
    RUN_DIRECTORY_COPY_LABEL,
    RUN_GOAL,
    RUN_HEADER,
    RUN_LIST,
    RUN_LIST_LABEL,
    RUN_PATH,
    RUN_PATH_ROW,
    RUN_UNHELD_GOAL,
    RUN_USAGE,
    UNHELD_RUN_LABEL
} from "#src/lab-maintenance/lab-maintenance.const";
import { formatByteSize } from "#src/value-display/byte-size";

interface RunDirectoryListProps {
    runs: readonly RunDirectoryUsage[];
}

/**
 * One row per run directory on disk. The path is shown whole and stays copyable, because it is what
 * an operator hands to whatever reads the artifacts next.
 */
export function RunDirectoryList({ runs }: RunDirectoryListProps) {
    return (
        <ul className={RUN_LIST} aria-label={RUN_LIST_LABEL}>
            {runs.map((run) => (
                <li key={run.investigation_id} className={RUN_CARD}>
                    <div className={RUN_HEADER}>
                        <p className={run.goal === null ? RUN_UNHELD_GOAL : RUN_GOAL}>
                            {run.goal ?? UNHELD_RUN_LABEL}
                        </p>
                        <p className={RUN_USAGE}>
                            {formatByteSize(run.bytes)} · {run.file_count} {FILE_COUNT_LABEL}
                        </p>
                    </div>
                    <div className={RUN_PATH_ROW}>
                        <p className={RUN_PATH}>{run.path}</p>
                        <CopyButton value={run.path} label={RUN_DIRECTORY_COPY_LABEL} />
                    </div>
                </li>
            ))}
        </ul>
    );
}
