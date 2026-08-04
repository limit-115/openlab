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

export const RUN_LIST_LABEL = "Run directories" as const;
export const UNHELD_RUN_LABEL = "No investigation holds this directory" as const;
export const RUN_DIRECTORY_COPY_LABEL = "Copy the run directory path" as const;
export const FILE_COUNT_LABEL = "files" as const;

export const PURGE_LABEL = "Purge the lab" as const;
export const PURGING_LABEL = "Purging" as const;
export const PURGE_TITLE = "Purge every investigation?" as const;
export const PURGE_CONSEQUENCE =
    "Every investigation stops, and its bets, findings, verdicts and run directory are deleted along with every directory left behind. This cannot be undone." as const;
export const PURGE_CONFIRM_LABEL = "Purge it all" as const;
export const PURGE_CANCEL_LABEL = "Keep the lab" as const;
export const PURGE_FAILURE_LABEL = "The lab could not be purged." as const;

export const STORAGE_TOTAL = "flex flex-wrap items-baseline gap-x-2 gap-y-1" as const;
export const STORAGE_TOTAL_SIZE = "text-sm font-medium" as const;
export const STORAGE_ROOT = "text-sm break-all text-muted-foreground" as const;
export const STORAGE_PENDING = "flex items-center gap-2 text-sm text-muted-foreground" as const;
export const STORAGE_FAILURE = "text-sm text-destructive" as const;

export const RUN_LIST = "grid gap-2" as const;
export const RUN_CARD = "grid gap-1 rounded-2xl bg-input/40 px-4 py-3" as const;
export const RUN_HEADER = "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1" as const;
export const RUN_GOAL = "min-w-0 text-sm font-medium" as const;
export const RUN_UNHELD_GOAL = "min-w-0 text-sm font-medium text-muted-foreground" as const;
export const RUN_USAGE = "text-sm text-muted-foreground" as const;
export const RUN_PATH_ROW = "flex items-start gap-1" as const;
export const RUN_PATH = "min-w-0 flex-1 text-sm break-all text-muted-foreground" as const;
