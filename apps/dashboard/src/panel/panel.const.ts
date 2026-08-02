export const PANEL_FRAME = "scroll-mt-24" as const;

/**
 * Below `sm` the header becomes a single column so a wide action, such as the claim filter, drops
 * under the title instead of overrunning it.
 */
export const PANEL_HEADER = "border-b max-sm:grid-cols-1" as const;

export const PANEL_TITLE = "flex items-center gap-3" as const;

export const PANEL_ICON =
    "grid size-8 flex-none place-items-center rounded-xl bg-muted text-muted-foreground" as const;

export const PANEL_ACTION =
    "min-w-0 max-sm:col-start-1 max-sm:row-start-3 max-sm:justify-self-start max-sm:pt-1" as const;
