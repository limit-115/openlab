export const READ_AT_LABEL = "Read at" as const;

export const REFRESH_LABEL = "Refresh" as const;

export const REFRESH_FAILURE_LABEL = "The vendors could not be asked again." as const;

/** The reading time and the button that moves it, on one line above what they describe. */
export const READING_HEADER =
    "flex flex-wrap items-center justify-between gap-x-6 gap-y-2" as const;

/** The button keeps the reason it refused beside it, so the two never read as separate lines. */
export const READING_ACTIONS = "flex flex-wrap items-center gap-x-3 gap-y-2" as const;

export const READING_TIME = "text-sm text-muted-foreground" as const;

export const READING_REFRESH_FAILURE = "text-sm text-destructive" as const;

/** The icon turns while the vendors are being asked, so a slow vendor still shows as progress. */
export const READING_REFRESH_TURNING = "animate-spin" as const;
