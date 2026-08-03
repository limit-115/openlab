/** A panel's own rhythm: the heading, then whatever it reports on. */
export const PANEL = "grid gap-4" as const;

/**
 * The heading is set on the page rather than in a card, so a wide action such as the claim filter
 * keeps to its right and drops under it only once the row runs out of room.
 */
export const PANEL_HEADER = "flex flex-wrap items-start justify-between gap-x-6 gap-y-3" as const;

export const PANEL_HEADING = "flex min-w-0 flex-col gap-1" as const;

export const PANEL_TITLE = "font-heading text-lg font-medium" as const;

export const PANEL_DESCRIPTION = "text-sm text-muted-foreground" as const;

export const PANEL_ACTION = "flex min-w-0 flex-wrap items-center gap-2" as const;

/**
 * A ledger grows without limit, so the list keeps its own height and scrolls inside it. Without a
 * bound, one busy section pushes every section under it out of reach.
 */
export const PANEL_SCROLLER = "max-h-192 overflow-y-auto" as const;
