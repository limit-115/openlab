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

/** The bar carries one group: the way into the sidebar, and the way back up the trail beside it. */
export const LAYOUT_BAR_ROW = "flex items-center gap-2 py-3" as const;

/**
 * The divider runs the whole bar rather than the row inside it: it stretches to the row's content
 * and then pulls back the row's own padding, so it meets the top edge and the bar's bottom rule.
 * It keeps the row's own gap either side of it: a rule this tall reads as a divider when it sits
 * close to what it divides, and as a column of its own once it is given room.
 */
export const LAYOUT_BAR_DIVIDER = "-my-3 mx-2" as const;

/**
 * The trigger stands between the frame's edge and the divider, and the frame keeps a page wider of
 * that edge than the divider is given. It gives back what the frame holds beyond the divider's own
 * distance, so the same distance falls either side of it, in the middle of the column it opens.
 */
export const LAYOUT_BAR_TRIGGER = "sm:-ml-2" as const;

/** The trail stays on one line: a long step is clipped rather than wrapped into a taller bar. */
export const TRAIL_LIST = "min-w-0 flex-nowrap" as const;

export const TRAIL_ITEM = "min-w-0" as const;

/**
 * A step is capped rather than sized to its label, so a goal that runs to a sentence cannot push the
 * rest of the trail out of the bar. What is clipped stays readable in the step's own tooltip.
 */
export const TRAIL_STEP = "block max-w-64 truncate" as const;

/** The mark between two steps is not a step, so it never gives up its own width. */
export const TRAIL_SEPARATOR = "shrink-0" as const;

/** The one scrolling region of the layout: everything the open page put in the inset. */
export const LAYOUT_SCROLLER = "min-h-0 flex-1 overflow-y-auto" as const;

/**
 * The horizontal frame every page shares. The inset already holds the page off the viewport edge
 * and rounds its own corners, so a page fills the width it is given and only clears that corner.
 */
export const LAYOUT_FRAME = "w-full px-4 sm:px-6" as const;

/** The distance a page keeps from the bar above it, so no page opens flush against it. */
export const LAYOUT_BODY = "pt-6 pb-12" as const;
