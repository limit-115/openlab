export const LabStorageEndpoint = {
    USAGE: "/api/storage",
    PURGE: "/api/storage/purge"
} as const;

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

/** The root is the one path every investigation directory hangs off, so it gets its own strip. */
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
