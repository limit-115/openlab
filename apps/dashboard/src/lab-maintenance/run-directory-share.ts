import type { RunDirectoryUsage } from "@nightlab/protocol/lab-storage/lab-storage.types";
import { localeFormatter } from "#src/value-display/locale-formatter";

/** The scale every share is read on, and the one a meter drawing a share is set to. */
export const WHOLE_SHARE = 100;

const SMALLEST_STATED_SHARE = 1;
const SMALLER_SHARE_LABEL = "<1%";

const shareFormatter = localeFormatter(
    (locale) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
);

export interface RunDirectoryShare {
    run: RunDirectoryUsage;
    /** What this directory takes of the lab's total, from 0 to 100. */
    percent: number;
}

/**
 * The heaviest directory first, each measured against the lab's total, because what an operator
 * reads this list for is which directory is worth taking back.
 */
export function runDirectoryShares(
    runs: readonly RunDirectoryUsage[],
    totalBytes: number
): RunDirectoryShare[] {
    return [...runs]
        .sort((heavier, lighter) => lighter.bytes - heavier.bytes)
        .map((run) => ({
            run,
            percent: totalBytes === 0 ? 0 : (run.bytes / totalBytes) * WHOLE_SHARE
        }));
}

/** A directory too small to round up to a percent still took space, so it never reads as none. */
export function formatShare(percent: number): string {
    if (percent > 0 && percent < SMALLEST_STATED_SHARE) {
        return SMALLER_SHARE_LABEL;
    }
    return `${shareFormatter().format(percent)}%`;
}
