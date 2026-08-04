/**
 * The horizontal frame shared by the header, the dashboard grid and the footer. It stops well
 * short of the viewport edge on a wide screen, so a line of text stays a readable length instead
 * of stretching across the whole monitor.
 */
export const PAGE_FRAME = "mx-auto w-full max-w-320 px-4 sm:px-6 lg:px-12" as const;

/**
 * The horizontal frame for a page hung inside the sidebar's inset. The inset already holds the page
 * off the viewport edge and rounds its own corners, so the page takes the whole width it is given
 * and keeps only enough padding to stay clear of that corner.
 */
export const INSET_FRAME = "w-full px-4 sm:px-6" as const;

export const APP_SHELL = "min-h-screen" as const;

/**
 * The distance a page keeps from the header above it and the footer below it. It belongs to the
 * shell rather than to a page, so a page hung off a shell cannot open flush against either bar.
 */
export const PAGE_BODY = "pt-6 pb-12" as const;

/**
 * A section is bounded by the space around it rather than by an outline, so the gap between two
 * sections has to stay clearly wider than the gap a section keeps between its heading and its cards.
 */
export const DASHBOARD = "grid gap-10 text-sm" as const;

export const APP_FOOTER =
    "flex flex-col gap-1 pb-8 text-sm text-muted-foreground sm:flex-row sm:justify-between" as const;
