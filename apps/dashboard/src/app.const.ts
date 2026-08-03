/**
 * The horizontal frame shared by the header, the dashboard grid and the footer. It stops well
 * short of the viewport edge on a wide screen, so a line of text stays a readable length instead
 * of stretching across the whole monitor.
 */
export const PAGE_FRAME = "mx-auto w-full max-w-320 px-4 sm:px-6 lg:px-12" as const;

export const APP_SHELL = "min-h-screen" as const;

export const DASHBOARD = "grid gap-4 pt-6 pb-12 text-sm" as const;

export const APP_FOOTER =
    "flex flex-col gap-1 pb-8 text-sm text-muted-foreground sm:flex-row sm:justify-between" as const;
