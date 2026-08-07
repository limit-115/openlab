/**
 * How far ahead the controller will ever set a single timer. A wait of days is stepped through in
 * these instead of set in one go: a timer longer than the platform's own limit fires immediately,
 * and a machine that slept through one never fires it at all, so the wait is re-read as it passes.
 */
export const RESUME_STEP_MS = 3_600_000;

/** Why the investigation is awake, written where an operator reads its history rather than its logs. */
export const RESUME_REASON = "The allowances this investigation was waiting on are back";
