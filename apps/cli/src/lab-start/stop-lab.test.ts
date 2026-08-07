import { afterEach, describe, expect, it, vi } from "vitest";
import { ControlKey } from "#src/lab-start/control-keys.const";
import type { KeyboardStream } from "#src/lab-start/control-keys.types";
import { stopLab, stopLabWhenAsked } from "#src/lab-start/stop-lab";
import { FORCED_STOP_EXIT_CODE, ShutdownSignal } from "#src/lab-start/stop-lab.const";
import type { StopLabOptions } from "#src/lab-start/stop-lab.types";

const exitCodeBeforeTests = process.exitCode;
const listenersBeforeTests = new Map(
    Object.values(ShutdownSignal).map((signal) => [signal, process.listeners(signal)])
);

afterEach(() => {
    process.exitCode = exitCodeBeforeTests;
    /** A test that put the lab under a signal takes it back out, and leaves the run's own alone. */
    for (const [signal, held] of listenersBeforeTests) {
        for (const listener of process.listeners(signal)) {
            if (!held.includes(listener)) {
                process.removeListener(signal, listener);
            }
        }
    }
    vi.restoreAllMocks();
});

/** What the operator would have seen, kept out of the test run's own output. */
function terminal(): () => string {
    const written: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk: string | Uint8Array) => {
        written.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
        return true;
    });
    return () => written.join("");
}

/** Long enough for a timer set for now, without holding the test to a real wait. */
function settle(): Promise<void> {
    return new Promise((done) => setTimeout(done, 5));
}

/** A keyboard, and the keys pressed on it, for the tests about what the operator presses. */
function keyboard(isTTY = true) {
    const pressed = new Set<(key: Buffer) => void>();
    const stream: KeyboardStream = {
        isTTY,
        setRawMode: () => undefined,
        on: (_event, listener) => {
            pressed.add(listener);
        },
        off: (_event, listener) => {
            pressed.delete(listener);
        },
        resume: () => undefined,
        pause: () => undefined
    };
    return {
        stream,
        press: (key: ControlKey) => {
            for (const listener of [...pressed]) {
                listener(Buffer.from([key]));
            }
        },
        listening: () => pressed.size > 0
    };
}

/**
 * A lab under the signals alone. The terminal these tests describe is the one the operator reads,
 * never one whose keys are ours to take, so the run's own is left where it is.
 */
function labUnderSignals(close: () => Promise<void>, options: StopLabOptions = {}): void {
    stopLabWhenAsked(close, { keyboard: keyboard(false).stream, ...options });
}

describe("stopLab", () => {
    it("says the lab is going while it goes, and goodbye only once it is down", async () => {
        const read = terminal();
        let terminalWhileClosing = "";

        await stopLab(async () => {
            terminalWhileClosing = read();
        });

        expect(terminalWhileClosing).toContain("Stopping the lab");
        expect(terminalWhileClosing).not.toContain("See you soon");
        expect(read()).toContain("See you soon");
    });

    /**
     * A lab stopped on purpose is not a failed command. Reporting one makes pnpm, a shell and a
     * service manager each announce a failure to an operator who only pressed Ctrl+C.
     */
    it("leaves a clean exit code behind a lab the operator asked to stop", async () => {
        terminal();

        await stopLab(async () => undefined);

        expect(process.exitCode ?? 0).toBe(0);
    });

    it("names what would not close, and fails a command that could not stop its lab", async () => {
        const read = terminal();

        await stopLab(async () => {
            throw new Error("The database would not close");
        });

        expect(read()).toContain("The database would not close");
        expect(process.exitCode).toBe(1);
    });
});

describe("stopLabWhenAsked, at the keyboard", () => {
    /** Hours of agents at work are not thrown away by whichever key the operator hit last. */
    it("asks before taking the lab down, and leaves it up until the question is answered", () => {
        const read = terminal();
        const close = vi.fn(async () => undefined);
        const operator = keyboard();

        stopLabWhenAsked(close, { interactive: true, keyboard: operator.stream });
        operator.press(ControlKey.INTERRUPT);

        expect(read()).toContain("Press Ctrl+C again to stop the lab");
        expect(close).not.toHaveBeenCalled();
    });

    /**
     * A key is pressed once and read once. Nothing forwards a keystroke the way a script runner
     * forwards a signal, so the second press is the operator answering however fast they were.
     */
    it("stops on the second press, however close behind the first it lands", () => {
        terminal();
        const close = vi.fn(async () => undefined);
        const operator = keyboard();

        stopLabWhenAsked(close, { interactive: true, keyboard: operator.stream });
        operator.press(ControlKey.INTERRUPT);
        operator.press(ControlKey.INTERRUPT);

        expect(close).toHaveBeenCalledOnce();
    });

    /** A keyboard still being read holds the process open long after the lab is down. */
    it("hands the terminal back once the lab is down", async () => {
        terminal();
        const operator = keyboard();

        stopLabWhenAsked(async () => undefined, { interactive: true, keyboard: operator.stream });
        operator.press(ControlKey.INTERRUPT);
        operator.press(ControlKey.INTERRUPT);
        await settle();

        expect(operator.listening()).toBe(false);
    });
});

describe("stopLabWhenAsked, on a signal", () => {
    /** Hours of agents at work are not thrown away by whichever key the operator hit last. */
    it("asks before taking down a lab somebody is watching, and leaves it up until answered", () => {
        const read = terminal();
        const close = vi.fn(async () => undefined);

        labUnderSignals(close, { interactive: true });
        process.emit(ShutdownSignal.INTERRUPT);

        expect(read()).toContain("Press Ctrl+C again to stop the lab");
        expect(close).not.toHaveBeenCalled();
    });

    it("stops the lab on the interrupt that answers the question", () => {
        terminal();
        const close = vi.fn(async () => undefined);

        labUnderSignals(close, { interactive: true, samePressWithinMs: 0 });
        process.emit(ShutdownSignal.INTERRUPT);
        process.emit(ShutdownSignal.INTERRUPT);

        expect(close).toHaveBeenCalledOnce();
    });

    /**
     * Ctrl+C on a lab started through pnpm arrives twice within milliseconds, and a forwarded copy
     * counted as the answer would be a lab that never really asked.
     */
    it("reads the interrupt a script runner forwards as the one press it is, not as an answer", () => {
        terminal();
        const close = vi.fn(async () => undefined);

        labUnderSignals(close, { interactive: true });
        process.emit(ShutdownSignal.INTERRUPT);
        process.emit(ShutdownSignal.INTERRUPT);

        expect(close).not.toHaveBeenCalled();
    });

    /** A press an hour old is no part of an answer, so the next one starts the question over. */
    it("puts the question again once an unanswered one has lapsed, rather than stopping", async () => {
        const read = terminal();
        const close = vi.fn(async () => undefined);

        labUnderSignals(close, { interactive: true, samePressWithinMs: 0, confirmWithinMs: 1 });
        process.emit(ShutdownSignal.INTERRUPT);
        await settle();
        process.emit(ShutdownSignal.INTERRUPT);

        expect(close).not.toHaveBeenCalled();
        expect(read().match(/Press Ctrl\+C again to stop the lab/g)).toHaveLength(2);
    });

    /** A service manager has no keyboard to answer with, and Node kills a process that stalls. */
    it("stops a lab a service manager takes down at its first signal, watched terminal or not", () => {
        terminal();
        const close = vi.fn(async () => undefined);

        labUnderSignals(close, { interactive: true });
        process.emit(ShutdownSignal.TERMINATE);

        expect(close).toHaveBeenCalledOnce();
    });

    it("stops a lab nobody is watching at the first interrupt, there being nobody to ask", () => {
        terminal();
        const close = vi.fn(async () => undefined);

        labUnderSignals(close, { interactive: false });
        process.emit(ShutdownSignal.INTERRUPT);

        expect(close).toHaveBeenCalledOnce();
    });

    /**
     * The interrupt a script runner forwards lands while the lab is still going down, and Node
     * kills whatever is left of a process holding no listener for it.
     */
    it("stays under the signal while it is stopping, so a further one cannot kill the stop", () => {
        terminal();
        const close = vi.fn(async () => undefined);
        const quit = vi.fn();

        labUnderSignals(close, { quit, interactive: true, samePressWithinMs: 0 });
        process.emit(ShutdownSignal.INTERRUPT);
        process.emit(ShutdownSignal.INTERRUPT);

        expect(process.listenerCount(ShutdownSignal.INTERRUPT)).toBeGreaterThan(0);

        process.emit(ShutdownSignal.INTERRUPT);

        expect(close).toHaveBeenCalledOnce();
        expect(quit).not.toHaveBeenCalled();
    });

    it("offers the way out of a stop that drags, and takes the next interrupt as taking it", async () => {
        const read = terminal();
        const quit = vi.fn();

        labUnderSignals(() => new Promise(() => undefined), {
            quit,
            interactive: true,
            samePressWithinMs: 0,
            quitOfferAfterMs: 0
        });
        process.emit(ShutdownSignal.INTERRUPT);
        process.emit(ShutdownSignal.INTERRUPT);
        await settle();

        expect(read()).toContain("quit without waiting");

        process.emit(ShutdownSignal.INTERRUPT);

        expect(quit).toHaveBeenCalledWith(FORCED_STOP_EXIT_CODE);
    });

    it("says nothing about a wait to a stop that did not have one", async () => {
        const read = terminal();

        labUnderSignals(async () => undefined, {
            interactive: true,
            samePressWithinMs: 0,
            quitOfferAfterMs: 0
        });
        process.emit(ShutdownSignal.INTERRUPT);
        process.emit(ShutdownSignal.INTERRUPT);
        await settle();

        expect(read()).toContain("See you soon");
        expect(read()).not.toContain("quit without waiting");
    });

    /** A service manager reads what the lab did; it cannot press anything. */
    it("keeps what to press out of a run nobody is watching", async () => {
        const read = terminal();

        labUnderSignals(() => new Promise(() => undefined), {
            quit: vi.fn(),
            interactive: false,
            quitOfferAfterMs: 0
        });
        process.emit(ShutdownSignal.INTERRUPT);
        await settle();

        expect(read()).toContain("Stopping the lab");
        expect(read()).not.toContain("Ctrl+C");
    });
});
