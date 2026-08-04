export const ALLOWANCE_SECTION_TITLE = "Subscriptions" as const;

/** How long a reading stands on the daemon, so polling faster would return the same answer. */
export const ALLOWANCE_REFETCH_MILLISECONDS = 60_000;

export const READING_PENDING_LABEL = "Asking the vendors what is left" as const;

export const NO_ALLOWANCE_TITLE = "No subscription readings" as const;

export const NO_ALLOWANCE_DESCRIPTION =
    "The local runtime is not reporting what the subscriptions have left, so the lab is dispatching without seeing their allowance." as const;

export const ALLOWANCE_READING_PENDING =
    "flex items-center gap-2 text-sm text-muted-foreground" as const;
