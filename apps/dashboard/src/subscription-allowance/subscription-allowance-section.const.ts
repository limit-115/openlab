/** How long a reading stands on the daemon, so polling faster would return the same answer. */
export const ALLOWANCE_REFETCH_MILLISECONDS = 60_000;

export const ALLOWANCE_READING_PENDING =
    "flex items-center gap-2 text-sm text-muted-foreground" as const;
