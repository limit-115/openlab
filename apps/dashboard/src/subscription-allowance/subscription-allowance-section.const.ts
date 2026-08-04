export const ALLOWANCE_SECTION_TITLE = "Subscriptions" as const;

/** How long a reading stands on the daemon, so polling faster would return the same answer. */
export const ALLOWANCE_REFETCH_MILLISECONDS = 60_000;

export const READING_PENDING_LABEL = "Asking the vendors what is left" as const;

export const NO_ALLOWANCE_TITLE = "No subscription readings" as const;

export const NO_ALLOWANCE_DESCRIPTION =
    "The local runtime is not reporting what the subscriptions have left, so the lab is dispatching without seeing their allowance." as const;

/** The block's own rhythm: its heading, the reading that dates the numbers, then the numbers. */
export const ALLOWANCE_SECTION = "grid gap-4" as const;

/** A block heading is the page's own voice, set the way the roster sets its title. */
export const ALLOWANCE_SECTION_TITLE_TEXT = "text-xl font-semibold" as const;

export const ALLOWANCE_READING_PENDING =
    "flex items-center gap-2 text-sm text-muted-foreground" as const;
