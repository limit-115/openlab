import { isTTY, spinner } from "@clack/prompts";
import { UpdateStep } from "#src/lab-update/update-progress.const";
import type { ReportUpdate, UpdateProgress } from "#src/lab-update/update-progress.types";

/** What each step of an update looks like from the outside, said as the operator would say it. */
export function updateLine(progress: UpdateProgress): string {
    switch (progress.step) {
        case UpdateStep.ASKING:
            return `Asking ${progress.channel} what it has`;
        case UpdateStep.DOWNLOADING:
            return `Downloading ${progress.file} — ${inMegabytes(progress.received)} of ${inMegabytes(progress.total)}`;
        case UpdateStep.UNPACKING:
            return `Unpacking ${progress.file}`;
        case UpdateStep.INSTALLING:
            return `Installing into ${progress.versionDirectory}`;
    }
}

/**
 * Writes what an update is doing over one line that keeps being rewritten, and hands back the way
 * to take that line down once there is an outcome to print under it.
 *
 * A terminal gets the line. Anything else — a pipe, a script, a log — gets nothing at all, because
 * a progress line rewritten a hundred times is a hundred lines in a file nobody wanted.
 */
export function reportUpdateToTerminal(): {
    readonly report: ReportUpdate;
    readonly done: () => void;
} {
    if (!isTTY(process.stdout)) {
        return { report: () => {}, done: () => {} };
    }

    const line = spinner();
    let last: string | undefined;

    return {
        report: (progress) => {
            const said = updateLine(progress);
            if (last === undefined) {
                line.start(said);
            } else {
                line.message(said);
            }
            last = said;
        },
        /**
         * Closed on the last thing it said rather than on nothing. Stopping with no message leaves
         * a bare symbol above the outcome, and the step an update stopped at is the one fact worth
         * keeping when what comes next is an error rather than an outcome.
         */
        done: () => {
            if (last !== undefined) {
                line.stop(last);
            }
        }
    };
}

/** Bytes as the operator reads them, which for an archive this size is whole megabytes. */
function inMegabytes(bytes: number): string {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
}
