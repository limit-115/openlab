import { ALLOWANCE_REFETCH_MILLISECONDS } from "#src/subscription-allowance/subscription-allowance-panel.const";

const MILLISECONDS_PER_MINUTE = 60_000;

const AUTO_REFRESH_MINUTES = ALLOWANCE_REFETCH_MILLISECONDS / MILLISECONDS_PER_MINUTE;

export const READ_AT_LABEL = "Read at" as const;

/**
 * A page that never moves on its own reads the same as one nobody is updating, so it says the
 * readings come back by themselves. Taken from the interval that does the polling, so the promise
 * cannot outlive the behaviour.
 */
export const AUTO_REFRESH_LABEL =
    AUTO_REFRESH_MINUTES === 1
        ? "Refreshes on its own every minute"
        : `Refreshes on its own every ${AUTO_REFRESH_MINUTES} minutes`;

export const REFRESH_LABEL = "Refresh" as const;

export const REFRESH_FAILURE_LABEL = "The vendors could not be asked again." as const;

/** The reading time and the button that moves it, on one line above what they describe. */
export const READING_HEADER =
    "flex flex-wrap items-center justify-between gap-x-6 gap-y-2" as const;

/** The button keeps the reason it refused beside it, so the two never read as separate lines. */
export const READING_ACTIONS = "flex flex-wrap items-center gap-x-3 gap-y-2" as const;

/** When the page was read and what keeps reading it, on one line as a single statement. */
export const READING_STATE = "flex flex-wrap items-center gap-x-1.5 gap-y-1" as const;

export const READING_TIME = "text-sm text-muted-foreground" as const;

export const READING_AUTO_REFRESH = "text-sm text-muted-foreground" as const;

export const READING_REFRESH_FAILURE = "text-sm text-destructive" as const;

/** The icon turns while the vendors are being asked, so a slow vendor still shows as progress. */
export const READING_REFRESH_TURNING = "animate-spin" as const;
