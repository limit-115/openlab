import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";

export const LAB_NAME = "Research Lab" as const;
export const LAB_SUBTITLE = "Local runtime" as const;

/** What the sidebar opens, in the order an operator reaches for it. */
export const LAB_VIEWS = [{ route: LabRoute.ROSTER, label: "Investigations" }] as const;

/** The one address that is not a view of the lab's work, so it stands apart from the rest. */
export const LAB_SETTINGS = { route: LabRoute.SETTINGS, label: "Settings" } as const;

/** The bar stays put, so the way to the sidebar is reachable however far a page has scrolled. */
export const LAYOUT_BAR = "sticky top-0 z-20 border-b bg-background/85 backdrop-blur-lg" as const;

export const LAYOUT_BAR_ROW = "flex items-center justify-between gap-4 py-3" as const;

/**
 * The horizontal frame every page shares. The inset already holds the page off the viewport edge
 * and rounds its own corners, so a page fills the width it is given and only clears that corner.
 */
export const LAYOUT_FRAME = "w-full px-4 sm:px-6" as const;

/** The distance a page keeps from the bar above it, so no page opens flush against it. */
export const LAYOUT_BODY = "pt-6 pb-12" as const;
