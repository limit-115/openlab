/**
 * What an update is doing right now.
 *
 * An update is the one command here that spends minutes on a network, and an operator watching a
 * terminal say nothing for a minute cannot tell a slow download from a hung one. Every step long
 * enough to be waited through says so while it happens.
 */
export const UpdateStep = {
    ASKING: "asking",
    DOWNLOADING: "downloading",
    UNPACKING: "unpacking",
    INSTALLING: "installing"
} as const;

export type UpdateStep = (typeof UpdateStep)[keyof typeof UpdateStep];
