export const SUBSCRIPTION_ALLOWANCE_ROUTE = "/api/subscriptions";

/**
 * How long a reading stands before the vendor is asked again. Every dashboard poll and every
 * dispatch decision consults the same reading, and asking Codex costs a process launch, so the
 * lab keeps well clear of the vendors' own monitoring limits.
 */
export const ALLOWANCE_READING_TTL_MILLISECONDS = 60_000;
