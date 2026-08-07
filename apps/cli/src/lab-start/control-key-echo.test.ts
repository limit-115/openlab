import { afterEach, describe, expect, it, vi } from "vitest";
import { hideControlKeyEcho } from "#src/lab-start/control-key-echo";
import type { SttyCall } from "#src/lab-start/control-key-echo.types";

afterEach(() => {
    vi.restoreAllMocks();
});

const AS_FOUND = "gfmt1:cflag=4b00:lflag=5cb";

/** A terminal that answers, and the way out it was handed for when the lab is done with it. */
function terminal(): { asked: string[][]; onExit: () => void } {
    const asked: string[][] = [];
    const stty: SttyCall = (args) => {
        asked.push([...args]);
        return args[0] === "-g" ? AS_FOUND : "";
    };
    let leaving: () => void = () => undefined;
    vi.spyOn(process, "once").mockImplementation(((event: string, listener: () => void) => {
        if (event === "exit") {
            leaving = listener;
        }
        return process;
    }) as typeof process.once);

    hideControlKeyEcho({ terminal: true, stty });
    return { asked, onExit: () => leaving() };
}

describe("hideControlKeyEcho", () => {
    it("turns off the echo that would print ^C over what the lab says the key did", () => {
        expect(terminal().asked).toContainEqual(["-echoctl"]);
    });

    /** The setting is the terminal's and outlives the lab, down to a preference we never made. */
    it("puts the terminal back exactly as it was found once the lab is done with it", () => {
        const { asked, onExit } = terminal();

        onExit();

        expect(asked.at(-1)).toEqual([AS_FOUND]);
    });

    it("changes nothing on a terminal that would not say what it was set to", () => {
        const stty = vi.fn<SttyCall>(() => undefined);

        hideControlKeyEcho({ terminal: true, stty });

        expect(stty.mock.calls).toEqual([[["-g"]]]);
    });

    /** Every run that is not an operator at a terminal — a service manager, a pipeline, a test. */
    it("asks nothing of a run with no terminal to ask", () => {
        const stty = vi.fn<SttyCall>(() => "");

        hideControlKeyEcho({ terminal: false, stty });

        expect(stty).not.toHaveBeenCalled();
    });
});
