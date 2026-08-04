export const LabStorageEndpoint = {
    USAGE: "/api/storage",
    PURGE: "/api/storage/purge"
} as const;

export const STORAGE_TITLE = "Storage" as const;
export const STORAGE_DESCRIPTION =
    "Where the lab keeps its run directories and what they take up." as const;

export const STORAGE_PENDING_LABEL = "Measuring the run directories" as const;
export const NO_STORAGE_TITLE = "This runtime does not report its disk" as const;
export const NO_STORAGE_DESCRIPTION =
    "A daemon started with a workspace root serves the reading here, and the purge with it." as const;
export const EMPTY_LAB_TITLE = "The lab is holding nothing on disk" as const;
export const EMPTY_LAB_DESCRIPTION =
    "Run directories appear here as soon as an investigation writes one." as const;

export const TOTAL_SIZE_LABEL = "On disk" as const;
/** Counted as directories, not as investigations: what is left behind is neither held by one nor
 * counted by the roster, and it is still on disk. */
export const RUN_COUNT_LABEL = "Directories" as const;
export const TOTAL_FILE_COUNT_LABEL = "Files" as const;
export const WORKSPACE_ROOT_COPY_LABEL = "Copy the workspace root path" as const;

export const RUN_TABLE_LABEL = "Run directories" as const;
export const UNHELD_RUN_LABEL = "No investigation holds this directory" as const;
export const RUN_DIRECTORY_COPY_LABEL = "Copy the run directory path" as const;
export const DIRECTORY_COLUMN_LABEL = "Directory" as const;
export const SHARE_COLUMN_LABEL = "Share of the lab" as const;
export const SIZE_COLUMN_LABEL = "Size" as const;
export const FILE_COUNT_COLUMN_LABEL = "Files" as const;
export const COPY_COLUMN_LABEL = "Copy" as const;

export const PURGE_LABEL = "Purge the lab" as const;
export const PURGING_LABEL = "Purging" as const;
export const PURGE_TITLE = "Purge every investigation?" as const;
export const PURGE_CONSEQUENCE =
    "Every investigation stops, and its bets, findings, verdicts and run directory are deleted along with every directory left behind. This cannot be undone." as const;
export const PURGE_CONFIRM_LABEL = "Purge it all" as const;
export const PURGE_CANCEL_LABEL = "Keep the lab" as const;
export const PURGE_FAILURE_LABEL = "The lab could not be purged." as const;

export const STORAGE_PENDING = "flex items-center gap-2 text-sm text-muted-foreground" as const;
export const STORAGE_FAILURE =
    "rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" as const;

/**
 * One object: what the lab takes up, then every directory that adds up to it. The table is set
 * flush to the card's edges so its rule spans the whole card rather than floating inside it.
 */
export const STORAGE_CARD = "gap-5" as const;

/**
 * A table closes the card on the last row's own padding. Keeping the card's would leave a band of
 * nothing under that row, which reads as one more directory that failed to draw.
 */
export const STORAGE_CARD_LISTING = "pb-0" as const;
export const STORAGE_SUMMARY = "gap-5" as const;
export const STORAGE_DIRECTORIES = "border-t px-0" as const;

export const STORAGE_STATS = "flex flex-wrap gap-x-12 gap-y-4" as const;

/**
 * The one thing that can be done about the reading, set level with it in the card's corner. It
 * keeps to the readings' row so the root strip under them still runs the width of the card.
 */
export const STORAGE_ACTION = "row-span-1" as const;
export const STORAGE_STAT = "grid gap-1" as const;
export const STORAGE_STAT_LABEL = "text-sm text-muted-foreground" as const;
export const STORAGE_STAT_VALUE = "font-heading text-2xl font-medium" as const;

/** The root is the one path every run directory hangs off, so it gets its own strip to sit in. */
export const STORAGE_ROOT_ROW =
    "col-span-2 flex items-center gap-2 rounded-xl bg-muted/40 py-1.5 pr-1.5 pl-3" as const;
export const STORAGE_ROOT_ICON = "size-4 shrink-0 text-muted-foreground" as const;
export const STORAGE_ROOT_PATH = "min-w-0 flex-1 text-sm break-all" as const;

/** The first and last columns keep the card's own padding, so the rows line up with the summary. */
export const RUN_TABLE =
    "[&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6" as const;

export const DIRECTORY_COLUMN = "w-full" as const;
export const SHARE_COLUMN = "w-48" as const;
export const NUMBER_COLUMN = "text-right" as const;
export const ACTION_COLUMN = "w-12" as const;

/**
 * A path wraps rather than being cut, so the whole of it stays readable and copyable; every cell
 * beside it is set to the top so its first line stays level with the directory's name.
 */
export const DIRECTORY_CELL = "align-top whitespace-normal" as const;
export const DIRECTORY_LINES = "grid gap-1" as const;
export const RUN_GOAL = "text-sm font-medium" as const;
export const RUN_UNHELD_GOAL = "text-sm font-medium text-muted-foreground" as const;
export const RUN_PATH = "text-sm break-all text-muted-foreground" as const;

export const SHARE_CELL = "align-top" as const;
export const SHARE_READING = "flex h-5 items-center gap-2" as const;

/**
 * A native progress element, so the browser draws the fill and the meter carries its own value to
 * assistive technology. The pseudo-element rules are the only way to reach the parts it paints.
 */
export const SHARE_METER =
    "h-1.5 min-w-0 flex-1 appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-foreground" as const;
export const SHARE_PERCENT =
    "w-10 shrink-0 text-right text-sm text-muted-foreground tabular-nums" as const;

export const SIZE_CELL = "align-top text-right text-sm font-medium tabular-nums" as const;
export const FILE_COUNT_CELL =
    "align-top text-right text-sm text-muted-foreground tabular-nums" as const;
export const ACTION_CELL = "align-top text-right" as const;
