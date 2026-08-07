/**
 * How long an archive may arrive at nothing at all before the download is given up on.
 *
 * This is a silence and not a deadline: a slow link keeps resetting it and finishes, while a
 * connection that stopped delivering hits it. Half a minute is long enough that a stalled proxy or
 * a laptop lid gets its chance to come back, and short enough that nobody sits watching a dead
 * command wondering whether it is working.
 */
export const DOWNLOAD_STALL_MS = 30_000;

/**
 * How much has to arrive before the operator is told again.
 *
 * Saying so per chunk would say so thousands of times for one archive. A megabyte is often enough
 * that a progress line moves visibly and rarely enough that saying it costs nothing.
 */
export const DOWNLOAD_REPORT_EVERY = 1024 * 1024;
