import { ControlKey, KeySignal } from "#src/lab-start/control-keys.const";
import type { ControlKeysOptions } from "#src/lab-start/control-keys.types";

/**
 * Takes a terminal's control keys, so that the lab answers them itself.
 *
 * A terminal left in its usual mode acts on Ctrl+C before the program hears of it: it prints ^C
 * across whatever the lab was drawing, and raises an interrupt at every process in the foreground,
 * which is how one press reaches a lab started through a script runner twice. Under raw mode both
 * stop happening. The key arrives as the byte it is, once, and the only thing on screen is what the
 * lab said the press did.
 *
 * What the terminal did for the other keys is now owed to them. Ctrl+Z hands the terminal back and
 * suspends for real, taking it again when the job is resumed; Ctrl+\ quits the way it always did,
 * with the terminal left as it was found. Anything else typed at a lab that reads no input is
 * swallowed rather than echoed into the middle of the block.
 *
 * Handing the terminal back is the caller's to do and returned here, because a keyboard still being
 * read holds open a process with nothing left to do.
 */
export function readControlKeys(
    onInterrupt: () => void,
    options: ControlKeysOptions = {}
): () => void {
    const keyboard = options.keyboard ?? process.stdin;
    const raise =
        options.raise ??
        ((signal: KeySignal) => {
            process.kill(process.pid, signal);
        });
    if (!keyboard.isTTY) {
        return () => undefined;
    }

    /**
     * The terminal goes back to the shell as it was found, and is taken again on the way in. A
     * process suspending itself stops inside the raise and comes out of it where the job was
     * resumed, so the line after is the way back — and it is also where a lab whose suspend was
     * ignored carries on, which is why the terminal is taken there rather than on a signal that
     * would never arrive.
     */
    const suspend = () => {
        keyboard.setRawMode(false);
        raise(KeySignal.SUSPEND);
        keyboard.setRawMode(true);
    };

    const onKey = (key: Buffer) => {
        if (key.includes(ControlKey.INTERRUPT)) {
            onInterrupt();
            return;
        }
        if (key.includes(ControlKey.SUSPEND)) {
            suspend();
            return;
        }
        if (key.includes(ControlKey.QUIT)) {
            keyboard.setRawMode(false);
            raise(KeySignal.QUIT);
        }
    };

    keyboard.setRawMode(true);
    keyboard.resume();
    keyboard.on("data", onKey);

    return () => {
        keyboard.off("data", onKey);
        keyboard.setRawMode(false);
        keyboard.pause();
    };
}
