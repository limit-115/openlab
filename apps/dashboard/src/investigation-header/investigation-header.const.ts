export const INVESTIGATION_HEADER_ROW =
    "flex flex-wrap items-center justify-between gap-x-8 gap-y-3" as const;

/** The views the investigation is read through, as a row of addresses. */
export const INVESTIGATION_HEADER_VIEWS =
    "flex w-fit flex-wrap items-center gap-x-6 gap-y-2" as const;

/**
 * Each view is an address, so it is rendered as the link it is: it can be opened in a new tab,
 * copied, and read as somewhere to go rather than as a control that switches a panel in place.
 */
export const INVESTIGATION_HEADER_VIEW =
    "text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline motion-reduce:transition-none" as const;

/** The address being read is named in the row itself, not only in the browser's location bar. */
export const INVESTIGATION_HEADER_VIEW_CURRENT = "font-medium text-foreground" as const;
