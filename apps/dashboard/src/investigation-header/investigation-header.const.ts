export const INVESTIGATION_HEADER_ROW =
    "flex flex-wrap items-center justify-between gap-x-8 gap-y-3" as const;

/**
 * What the operator does sits together on one side of the row: the view to read, and the controls
 * that steer the run it is a view of. The readings on the other side are only ever read.
 */
export const INVESTIGATION_HEADER_VIEWS = "flex flex-wrap items-center gap-3" as const;
