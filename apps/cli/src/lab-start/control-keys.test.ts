import { afterEach, describe, expect, it, vi } from "vitest";
import { readControlKeys } from "#src/lab-start/control-keys";
import { ControlKey, KeySignal } from "#src/lab-start/control-keys.const";
import type { KeyboardStream } from "#src/lab-start/control-keys.types";

afterEach(() => {
    vi.restoreAllMocks();
});

/** A terminal under the fingers of a test: everything done to it, in the order it happened. */
function keyboard(isTTY = true) {
    const pressed = new Set<(key: Buffer) => void>();
    const told: string[] = [];
    const stream: KeyboardStream = {
        isTTY,
        setRawMode: (raw) => {
            told.push(raw ? "raw" : "cooked");
        },
        on: (_event, listener) => {
            pressed.add(listener);
        },
        off: (_event, listener) => {
            pressed.delete(listener);
        },
        resume: () => {
            told.push("resume");
        },
        pause: () => {
            told.push("pause");
        }
    };
    return {
        stream,
        told,
        type: (keys: Buffer) => {
            for (const listener of [...pressed]) {
                listener(keys);
            }
        },
        listening: () => pressed.size > 0
    };
}

describe("readControlKeys", () => {
    it("answers Ctrl+C itself, rather than leaving the terminal to interrupt the process", () => {
        const terminal = keyboard();
        const onInterrupt = vi.fn();

        readControlKeys(onInterrupt, { keyboard: terminal.stream, raise: vi.fn() });
        terminal.type(Buffer.from([ControlKey.INTERRUPT]));

        expect(onInterrupt).toHaveBeenCalledOnce();
    });

    /**
     * The terminal no longer suspends anything, so the lab owes the key what it always did: the
     * shell gets its terminal back for as long as the lab is away, and never keeps it. A suspend
     * nothing acted on comes straight back here, which is the same ending.
     */
    it("hands the terminal back to suspend on Ctrl+Z, and takes it again on the way back", () => {
        const terminal = keyboard();

        readControlKeys(vi.fn(), {
            keyboard: terminal.stream,
            raise: (signal) => terminal.told.push(`raise ${signal}`)
        });
        terminal.type(Buffer.from([ControlKey.SUSPEND]));

        expect(terminal.told.slice(-3)).toEqual(["cooked", `raise ${KeySignal.SUSPEND}`, "raw"]);
    });

    it("quits on Ctrl+\\ the way the terminal would have, leaving the terminal as it was found", () => {
        const terminal = keyboard();
        const raise = vi.fn();

        readControlKeys(vi.fn(), { keyboard: terminal.stream, raise });
        terminal.type(Buffer.from([ControlKey.QUIT]));

        expect(terminal.told.at(-1)).toBe("cooked");
        expect(raise).toHaveBeenCalledWith(KeySignal.QUIT);
    });

    /** Raw mode means every keystroke arrives here, including the ones meant for nothing. */
    it("swallows what is typed at a lab that reads no input", () => {
        const terminal = keyboard();
        const onInterrupt = vi.fn();
        const raise = vi.fn();

        readControlKeys(onInterrupt, { keyboard: terminal.stream, raise });
        terminal.type(Buffer.from("stop please\n"));

        expect(onInterrupt).not.toHaveBeenCalled();
        expect(raise).not.toHaveBeenCalled();
    });

    it("hands the terminal back when released, so a lab that is done can end", () => {
        const terminal = keyboard();

        readControlKeys(vi.fn(), { keyboard: terminal.stream, raise: vi.fn() })();

        expect(terminal.listening()).toBe(false);
        expect(terminal.told.slice(-2)).toEqual(["cooked", "pause"]);
    });

    /** A pipeline, a service manager, a redirected input: nothing to take and nothing to read. */
    it("takes nothing from a run whose input is not a terminal", () => {
        const terminal = keyboard(false);
        const onInterrupt = vi.fn();

        readControlKeys(onInterrupt, { keyboard: terminal.stream, raise: vi.fn() })();

        expect(terminal.told).toEqual([]);
        expect(terminal.listening()).toBe(false);
    });
});
