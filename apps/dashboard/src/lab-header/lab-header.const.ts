export const LAB_HEADER_BAR =
    "sticky top-0 z-20 border-b bg-background/85 backdrop-blur-lg" as const;

export const LAB_HEADER_ROW =
    "flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-3" as const;

/** The readings and the palette control share the end of the row and wrap together. */
export const LAB_HEADER_RUNTIME = "flex flex-wrap items-center gap-x-5 gap-y-2" as const;

/** The views sit in the header because it is the only navigation the dashboard has. */
export const LAB_HEADER_VIEWS = "flex w-fit flex-wrap items-center gap-x-6 gap-y-2" as const;

/**
 * Each view is an address, so it is rendered as the link it is: it can be opened in a new tab,
 * copied, and read as somewhere to go rather than as a control that switches a panel in place.
 */
export const LAB_HEADER_VIEW =
    "text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline motion-reduce:transition-none" as const;

/** The address being read is named in the row itself, not only in the browser's location bar. */
export const LAB_HEADER_VIEW_CURRENT = "font-medium text-foreground" as const;
