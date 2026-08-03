import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";

/** Which runs the panel is showing. */
export const ExperimentFilter = {
    /** Running, failed, timed out or cancelled: the runs an operator can still act on. */
    ATTENTION: "attention",
    ALL: "all"
} as const;
export type ExperimentFilter = (typeof ExperimentFilter)[keyof typeof ExperimentFilter];

/**
 * A run nobody has to look at is one that finished cleanly — its result is already readable inside
 * the claim it produced — or one that has not started. Everything else is left on this panel.
 */
export const ATTENTION_STATUSES: readonly ExperimentStatus[] = [
    ExperimentStatus.RUNNING,
    ExperimentStatus.FAILED,
    ExperimentStatus.TIMED_OUT,
    ExperimentStatus.CANCELLED
];

export const EXPERIMENT_FILTERS: Array<{ value: ExperimentFilter; label: string }> = [
    { value: ExperimentFilter.ATTENTION, label: "Needs attention" },
    { value: ExperimentFilter.ALL, label: "All runs" }
];

/** Narrow panels scroll the filter rather than clipping it off the card edge. */
export const EXPERIMENT_FILTER_SCROLLER = "overflow-x-auto" as const;
