export const FRONTIER_COLUMN = "flex min-w-0 flex-col overflow-hidden rounded-2xl border" as const;

export const FRONTIER_COLUMN_HEADER = "flex items-center gap-2 border-b p-4" as const;

export const FRONTIER_COLUMN_TITLE = "flex-1 text-sm font-medium" as const;

/**
 * A frontier column grows without limit — open questions especially — so it scrolls inside its own
 * height instead of stretching the page and pushing every panel below it out of reach.
 */
export const FRONTIER_ITEM_SCROLLER = "max-h-72 overflow-y-auto p-4" as const;

export const FRONTIER_ITEM_LIST =
    "grid list-disc gap-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-border" as const;

export const FRONTIER_COLUMN_EMPTY = "p-4 text-sm text-muted-foreground" as const;
