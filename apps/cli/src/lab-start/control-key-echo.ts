import { execFileSync } from "node:child_process";
import type { ControlKeyEchoOptions, SttyCall } from "#src/lab-start/control-key-echo.types";

/**
 * Stops the terminal printing ^C across the lab's own answer to the key.
 *
 * A terminal echoes the control keys it is sent, so an operator asking the lab to stop puts a ^C
 * through the middle of the block the lab is drawing, and what the press actually did — the
 * question, the stop, the goodbye — arrives underneath the noise. The lab answers every press on
 * the line below, which is the same news said better, so the echo is turned off while the lab has
 * the terminal.
 *
 * The setting belongs to the terminal rather than to this process, and it outlives the process that
 * changed it. So what was there is saved first and put back on the way out, exactly as found, down
 * to the preference of an operator who had already turned the echo off themselves — and a terminal
 * that will not say what it is set to is left alone rather than set to something we could not undo.
 */
export function hideControlKeyEcho(options: ControlKeyEchoOptions = {}): void {
    const stty = options.stty ?? askTerminal;
    const terminal =
        options.terminal ?? (process.platform !== "win32" && process.stdin.isTTY === true);
    if (!terminal) {
        return;
    }
    const asFound = stty(["-g"]);
    if (asFound === undefined || stty(["-echoctl"]) === undefined) {
        return;
    }
    process.once("exit", () => {
        stty([asFound]);
    });
}

/** The terminal is the one on this process's input, which is what stty reads and writes. */
const askTerminal: SttyCall = (args) => {
    try {
        return execFileSync("stty", [...args], {
            stdio: ["inherit", "pipe", "ignore"],
            encoding: "utf8"
        }).trim();
    } catch {
        return undefined;
    }
};
