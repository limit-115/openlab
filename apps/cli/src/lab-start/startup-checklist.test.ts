import { DaemonStartupStep } from "@openlab/daemon/daemon-runtime/daemon-startup-progress.const";
import { describe, expect, it } from "vitest";
import { startupLine } from "#src/lab-start/startup-checklist";

describe("startupLine", () => {
    it("says where the lab put itself, which is the one thing nobody can guess", () => {
        expect(
            startupLine({
                step: DaemonStartupStep.HOME,
                detail: "/home/operator/.local/share/nightlab"
            })
        ).toContain("/home/operator/.local/share/nightlab");
    });

    it("names where a missing dashboard was looked for, and that the lab runs anyway", () => {
        const line = startupLine({
            step: DaemonStartupStep.DASHBOARD_MISSING,
            detail: "/somewhere/dist"
        });

        expect(line).toContain("/somewhere/dist");
        expect(line).toContain("runs without one");
    });

    it("tells an empty lab it is empty rather than counting to zero", () => {
        expect(startupLine({ step: DaemonStartupStep.INVESTIGATIONS, detail: "0" })).toBe(
            "No investigations yet"
        );
    });
});
