/** What the terminal setting needs from outside itself, which is a terminal and a way to ask it. */
export interface ControlKeyEchoOptions {
    /** Whether there is a terminal here whose settings are ours to change. */
    readonly terminal?: boolean;
    /** How the terminal is asked and told. */
    readonly stty?: SttyCall;
}

/**
 * A call to the terminal: stty's own arguments in, what it answered out, and nothing at all when
 * there was no answer to be had.
 */
export type SttyCall = (args: readonly string[]) => string | undefined;
