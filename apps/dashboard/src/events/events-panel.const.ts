export const LIVE_LABEL =
    "inline-flex items-center gap-2 text-sm font-medium text-primary" as const;

/**
 * The stream is a single card that keeps its own height and scrolls inside it. A busy lab reports
 * faster than anybody reads, and the panels below the journal have to stay reachable while it does.
 */
export const EVENT_STREAM = "max-h-96 list-none overflow-y-auto rounded-2xl border" as const;
