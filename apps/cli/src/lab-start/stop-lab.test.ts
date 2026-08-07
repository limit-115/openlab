import { afterEach, describe, expect, it, vi } from "vitest";
import { stopLab } from "#src/lab-start/stop-lab";

const exitCodeBeforeTests = process.exitCode;

afterEach(() => {
    process.exitCode = exitCodeBeforeTests;
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

describe("stopLab", () => {
    it("says goodbye once the lab is down, rather than while it is still going", async () => {
        const read = terminal();
        let closed = false;

        await stopLab(async () => {
            closed = true;
        });

        expect(closed).toBe(true);
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
