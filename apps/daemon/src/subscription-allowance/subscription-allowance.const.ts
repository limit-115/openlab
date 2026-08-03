export const SUBSCRIPTION_ALLOWANCE_ROUTE = "/api/subscriptions";

/**
 * How long a reading stands before the vendor is asked again. Every dashboard poll and every
 * dispatch decision consults the same reading, and asking Codex costs a process launch, so the
 * lab keeps well clear of the vendors' own monitoring limits.
 */
export const ALLOWANCE_READING_TTL_MILLISECONDS = 60_000;

/**
 * Asks for the vendors to be read again rather than for the reading the daemon is already holding.
 * Only an operator pressing refresh sends it: every automatic poll takes whatever the interval has.
 */
export const FRESH_READING_PARAM = "fresh";

export const FRESH_READING_VALUE = "1";
