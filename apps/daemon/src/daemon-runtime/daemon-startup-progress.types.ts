import type { DaemonStartupStep } from "#src/daemon-runtime/daemon-startup-progress.const";

/** One step of a lab coming up, and the one thing worth saying about it. */
export interface DaemonStartupProgress {
    readonly step: DaemonStartupStep;
    /** The path, the address or the count the step ended up with, in the operator's own terms. */
    readonly detail: string;
}

export type ReportDaemonStartup = (progress: DaemonStartupProgress) => void;
