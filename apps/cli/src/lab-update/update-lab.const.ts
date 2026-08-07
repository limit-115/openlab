/**
 * What an update came to.
 *
 * These are outcomes an operator is told about and not failures: a lab that is already current and
 * a lab that cannot be updated at all both did what was asked and have something to say. What can
 * go wrong along the way — an unreachable channel, a digest that does not match, a platform with no
 * build — raises instead, because there is nothing to report but the reason it stopped.
 */
export const UpdateResult = {
    /** This lab was not installed by the program, so the program has nothing of its to replace. */
    NOT_INSTALLED: "not_installed",
    ALREADY_CURRENT: "already_current",
    /** A lab built from sources, or one an operator moved forward past what is published. */
    AHEAD_OF_CHANNEL: "ahead_of_channel",
    /** The channel has something else, and the operator asked only to be told. */
    AVAILABLE: "available",
    UPDATED: "updated"
} as const;

export type UpdateResult = (typeof UpdateResult)[keyof typeof UpdateResult];
