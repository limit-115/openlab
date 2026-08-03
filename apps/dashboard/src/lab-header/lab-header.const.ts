export const LAB_HEADER_BAR =
    "sticky top-0 z-20 border-b bg-background/85 backdrop-blur-lg" as const;

export const LAB_HEADER_ROW =
    "flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-3" as const;

/** Keeps the lifecycle controls with the state they act on rather than at the far end of the row. */
export const LAB_HEADER_RUNTIME = "flex flex-wrap items-center gap-x-6 gap-y-3" as const;

/** The views sit in the header because it is the only navigation the dashboard has. */
export const LAB_HEADER_VIEWS = "w-fit" as const;
