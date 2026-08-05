import { log } from "@clack/prompts";
import {
    DaemonStartupOutcome,
    DaemonStartupStep
} from "@nightlab/daemon/daemon-runtime/daemon-startup-progress.const";
import type { DaemonStartupProgress } from "@nightlab/daemon/daemon-runtime/daemon-startup-progress.types";

/**
 * What a lab coming up looks like from the outside: one line per thing it got through, said as the
 * operator would say it rather than as the daemon names it internally.
 */
const READY_LINE: Record<DaemonStartupStep, (detail: string) => string> = {
    [DaemonStartupStep.HOME]: (home) => `Lab home at ${home}`,
    [DaemonStartupStep.DATABASE]: () => "Database ready",
    [DaemonStartupStep.DASHBOARD]: () => "Dashboard ready",
    [DaemonStartupStep.INVESTIGATIONS]: (count) =>
        count === "0" ? "No investigations yet" : `Reopened ${count} investigation(s)`
};

/** Only the dashboard can be absent and still leave a lab worth running. */
const MISSING_LINE: Record<DaemonStartupStep, (detail: string) => string> = {
    [DaemonStartupStep.HOME]: (home) => `No lab home at ${home}`,
    [DaemonStartupStep.DATABASE]: (database) => `No database at ${database}`,
    [DaemonStartupStep.DASHBOARD]: (root) => `No dashboard at ${root} — the lab runs without one`,
    [DaemonStartupStep.INVESTIGATIONS]: () => "No investigations were reopened"
};

export function startupLine(progress: DaemonStartupProgress): string {
    const line =
        progress.outcome === DaemonStartupOutcome.READY
            ? READY_LINE[progress.step]
            : MISSING_LINE[progress.step];
    return line(progress.detail);
}

/** Writes each step as the lab reaches it, so a slow one is watched rather than waited out. */
export function reportStartupToTerminal(progress: DaemonStartupProgress): void {
    const line = startupLine(progress);
    if (progress.outcome === DaemonStartupOutcome.READY) {
        log.success(line);
        return;
    }
    log.warn(line);
}
