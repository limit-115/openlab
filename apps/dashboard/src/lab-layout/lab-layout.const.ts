import { LabRoute } from "#src/dashboard-routes/dashboard-routes.const";

/** The places the lab always has, each of which the interface has a word for in both languages. */
export const LabPlace = {
    ROSTER: "roster",
    SETTINGS: "settings"
} as const;
export type LabPlace = (typeof LabPlace)[keyof typeof LabPlace];

/** What the sidebar opens, in the order an operator reaches for it. */
export const LAB_VIEWS = [{ route: LabRoute.ROSTER, place: LabPlace.ROSTER }] as const;

/** The one address that is not a view of the lab's work, so it stands apart from the rest. */
export const LAB_SETTINGS = { route: LabRoute.SETTINGS, place: LabPlace.SETTINGS } as const;

/**
 * The mark in the sidebar's head, standing on the sidebar itself rather than inside a filled tile:
 * the mark is already a boundary, and a boundary inside a second one reads as a box in a box. It
 * carries the brand colour instead, which is the treatment the brand pack gives a mark left bare.
 *
 * The size is forced because a menu button sizes every icon it holds to `size-4`, which is the
 * right rule for the addresses below and the wrong one for the thing the sidebar is headed by.
 */
export const SIDEBAR_MARK = "size-8! shrink-0 text-brand" as const;

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
