import {
    DaemonStartupOutcome,
    DaemonStartupStep
} from "@lab/daemon/daemon-runtime/daemon-startup-progress.const";
import { describe, expect, it } from "vitest";
import { startupLine } from "#src/lab-start/startup-checklist";

describe("startupLine", () => {
    /** A step nobody wrote a line for would come up as a blank tick the operator cannot read. */
    it("has something to say about every step a lab passes through, either way it goes", () => {
        for (const step of Object.values(DaemonStartupStep)) {
            for (const outcome of Object.values(DaemonStartupOutcome)) {
                expect(startupLine({ step, outcome, detail: "somewhere" })).not.toHaveLength(0);
            }
        }
    });

    it("says where the lab put itself, which is the one thing nobody can guess", () => {
        expect(
            startupLine({
                step: DaemonStartupStep.LAB_HOME,
                outcome: DaemonStartupOutcome.READY,
                detail: "/home/operator/.local/share/lab"
            })
        ).toContain("/home/operator/.local/share/lab");
    });

    it("names where a missing dashboard was looked for, and that the lab runs anyway", () => {
        const line = startupLine({
            step: DaemonStartupStep.DASHBOARD,
            outcome: DaemonStartupOutcome.MISSING,
            detail: "/somewhere/dist"
        });

        expect(line).toContain("/somewhere/dist");
        expect(line).toContain("runs without one");
    });

    it("tells an empty lab it is empty rather than counting to zero", () => {
        expect(
            startupLine({
                step: DaemonStartupStep.INVESTIGATIONS,
                outcome: DaemonStartupOutcome.READY,
                detail: "0"
            })
        ).toBe("No investigations yet");
    });
});
