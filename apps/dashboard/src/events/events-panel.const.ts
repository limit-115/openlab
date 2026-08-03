export const LIVE_LABEL =
    "inline-flex items-center gap-2 text-sm font-medium text-primary" as const;

/**
 * The stream keeps its own height and scrolls inside it. A busy lab reports faster than anybody
 * reads, and the panels below the journal have to stay reachable while it does.
 */
export const EVENTS_BODY = "max-h-96 overflow-y-auto px-0" as const;

export const EVENT_STREAM = "list-none" as const;
