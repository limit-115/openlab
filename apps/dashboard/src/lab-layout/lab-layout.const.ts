import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";

export const LAB_NAME = "Research Lab" as const;
export const LAB_SUBTITLE = "Local runtime" as const;

/** What the sidebar opens, in the order an operator reaches for it. */
export const LAB_VIEWS = [{ route: LabRoute.ROSTER, label: "Investigations" }] as const;

/** The one address that is not a view of the lab's work, so it stands apart from the rest. */
export const LAB_SETTINGS = { route: LabRoute.SETTINGS, label: "Settings" } as const;

/**
 * The layout is exactly as tall as the viewport and never grows past it. Nothing outside the page
 * itself scrolls: the sidebar and the inset are frames, and each scrolls its own content.
 */
export const LAYOUT_WRAPPER = "h-svh overflow-hidden" as const;

/** The inset is a card of a fixed size, so its rounded edge stays where it is put. */
export const LAYOUT_INSET = "min-h-0 overflow-hidden" as const;

/** The bar belongs to the frame rather than to the page, so it is outside what scrolls. */
export const LAYOUT_BAR = "shrink-0 border-b" as const;

export const LAYOUT_BAR_ROW = "flex items-center justify-between gap-4 py-3" as const;

/** The way into the sidebar and the way back up the trail read as one group, so they sit together. */
export const LAYOUT_BAR_TRAIL = "flex min-w-0 items-center gap-2" as const;

/** The one scrolling region of the layout: everything the open page put in the inset. */
export const LAYOUT_SCROLLER = "min-h-0 flex-1 overflow-y-auto" as const;

/**
 * The horizontal frame every page shares. The inset already holds the page off the viewport edge
 * and rounds its own corners, so a page fills the width it is given and only clears that corner.
 */
export const LAYOUT_FRAME = "w-full px-4 sm:px-6" as const;

/** The distance a page keeps from the bar above it, so no page opens flush against it. */
export const LAYOUT_BODY = "pt-6 pb-12" as const;
