/**
 * The smallest cap the page will set. At nothing at all the window is already past its cap however
 * little is spent, so the limiter dragged to the floor holds the subscription outright: an operator
 * takes a harness off the roster on the same meter they trim it on.
 */
export const SPEND_CAP_MIN_PERCENT = 0;

/** Caps land on whole percent, which is the finest a percentage reading has, so the handle follows the drag. */
export const SPEND_CAP_STEP_PERCENT = 1;

/** The reading and the limiter that rides on it share one row: the limiter is a mark on the reading. */
export const CAP_METER_ROW = "relative flex h-5 w-full items-center" as const;

/**
 * The limiter lies over the meter and draws nothing of its own. Its track is transparent because the
 * meter underneath is the track: what the operator drags along is the window they are capping.
 */
export const CAP_SLIDER =
    "absolute inset-0 flex w-full touch-none items-center select-none" as const;

export const CAP_SLIDER_TRACK = "relative h-2.5 w-full grow rounded-full" as const;

/**
 * A narrow upright handle rather than a knob, so it reads as a line drawn across the bar at the
 * point the lab stops. The ring in the page's own background colour keeps it legible wherever on
 * the meter it lands, filled or empty.
 */
export const CAP_SLIDER_THUMB =
    "block h-5 w-1.5 cursor-grab rounded-full bg-foreground ring-2 ring-background transition-[box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-hidden active:cursor-grabbing" as const;
