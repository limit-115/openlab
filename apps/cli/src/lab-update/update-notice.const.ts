/**
 * How long the channel's answer stands before it is asked again.
 *
 * A day is long enough that starting a lab repeatedly costs one request, and short enough that an
 * operator hears about a release within a day of it being published. Nothing is installed off this
 * answer, so being a few hours out of date with it costs nothing.
 */
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * How long a lab coming up will wait on the channel before going on without it.
 *
 * A lab that cannot reach a network still starts, and still starts at the same speed. The notice is
 * the least important thing happening during a start and is the first thing given up on.
 */
export const UPDATE_CHECK_TIMEOUT_MS = 3_000;
