/** How long a reading stands on the daemon, so polling faster would return the same answer. */
export const ALLOWANCE_REFETCH_MILLISECONDS = 60_000;

export const ALLOWANCE_READING_PENDING =
    "flex items-center gap-2 text-sm text-muted-foreground" as const;

/** The one control that hands the caps over, and whatever the lab answered to the last one. */
export const CAPS_ACTIONS = "flex flex-wrap items-center justify-end gap-3" as const;

export const CAPS_FAILURE = "text-sm text-destructive" as const;

/** Takes the place the save was in, so the answer to it lands where the control stood. */
export const CAPS_SAVED =
    "flex items-center justify-end gap-1.5 text-sm text-muted-foreground [&_svg]:size-4" as const;
