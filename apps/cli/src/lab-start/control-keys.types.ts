import type { KeySignal } from "#src/lab-start/control-keys.const";

/**
 * A terminal, in as much of it as reading keys needs: whether it is one at all, how to take it and
 * hand it back, and how to hear what is pressed on it.
 */
export interface KeyboardStream {
    readonly isTTY: boolean;
    setRawMode(raw: boolean): void;
    on(event: "data", listener: (key: Buffer) => void): void;
    off(event: "data", listener: (key: Buffer) => void): void;
    resume(): void;
    pause(): void;
}

/** What reading keys needs from outside itself, which is a terminal and a way to raise a signal. */
export interface ControlKeysOptions {
    readonly keyboard?: KeyboardStream | undefined;
    /** How the program raises on itself what the terminal used to raise for it. */
    readonly raise?: ((signal: KeySignal) => void) | undefined;
}
