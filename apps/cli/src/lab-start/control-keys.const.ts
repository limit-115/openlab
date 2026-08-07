/**
 * The keys a terminal acts on by itself, which under raw mode arrive as the bytes they are and
 * leave the program to do what the terminal used to.
 */
export const ControlKey = {
    INTERRUPT: 0x03,
    SUSPEND: 0x1a,
    QUIT: 0x1c
} as const;
export type ControlKey = (typeof ControlKey)[keyof typeof ControlKey];

/** What the terminal would have raised for those keys, now raised by the program instead. */
export const KeySignal = {
    SUSPEND: "SIGTSTP",
    QUIT: "SIGQUIT"
} as const;
export type KeySignal = (typeof KeySignal)[keyof typeof KeySignal];
