import { log } from "@clack/prompts";
import { DaemonStartupStep } from "@openlab/daemon/daemon-runtime/daemon-startup-progress.const";
import type { DaemonStartupProgress } from "@openlab/daemon/daemon-runtime/daemon-startup-progress.types";

/**
 * What a lab coming up looks like from the outside: one line per thing it got through, said as the
 * operator would say it rather than as the daemon names it internally.
 */
const STARTUP_LINE: Record<DaemonStartupStep, (detail: string) => string> = {
    [DaemonStartupStep.HOME]: (home) => `Lab home at ${home}`,
    [DaemonStartupStep.DATABASE]: () => "Database ready",
    [DaemonStartupStep.DASHBOARD]: () => "Dashboard ready",
    [DaemonStartupStep.DASHBOARD_MISSING]: (root) =>
        `No dashboard at ${root} — the lab runs without one`,
    [DaemonStartupStep.INVESTIGATIONS]: (count) =>
        count === "0" ? "No investigations yet" : `Reopened ${count} investigation(s)`
};

export function startupLine(progress: DaemonStartupProgress): string {
    return STARTUP_LINE[progress.step](progress.detail);
}

/**
 * Writes each step as the lab reaches it, so a slow one is watched rather than waited out. A missing
 * dashboard is the one step that is not good news, and it is a warning rather than a failure because
 * the lab keeps coming up without one.
 */
export function reportStartupToTerminal(progress: DaemonStartupProgress): void {
    const line = startupLine(progress);
    if (progress.step === DaemonStartupStep.DASHBOARD_MISSING) {
        log.warn(line);
        return;
    }
    log.success(line);
}
