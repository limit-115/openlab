import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";

export const EXPERIMENT_LIST = "gap-3" as const;

export const EXPERIMENT_STATUS = "size-8 rounded-xl border" as const;

/** The mark carries the same colour as the status badge beside it, so the card reads as one thing. */
export const EXPERIMENT_STATUS_TONE: Record<ExperimentStatus, string> = {
    [ExperimentStatus.PLANNED]: "border-warning/40 bg-warning/10 text-warning",
    [ExperimentStatus.RUNNING]: "border-primary/40 bg-primary/10 text-primary",
    [ExperimentStatus.SUCCEEDED]: "border-success/40 bg-success/10 text-success",
    [ExperimentStatus.FAILED]: "border-destructive/40 bg-destructive/10 text-destructive",
    [ExperimentStatus.TIMED_OUT]: "border-destructive/40 bg-destructive/10 text-destructive",
    [ExperimentStatus.CANCELLED]: "border-destructive/40 bg-destructive/10 text-destructive"
};

export const EXPERIMENT_HYPOTHESIS = "text-base" as const;

export const EXPERIMENT_COMMAND =
    "mt-2 flex min-w-0 items-center gap-2 rounded-xl bg-muted/50 px-3 py-2" as const;

export const EXPERIMENT_COMMAND_TEXT = "font-mono text-sm break-all" as const;

/** A failed run explains itself in full: the reason wraps rather than clips so it stays readable. */
export const EXPERIMENT_ERROR = "text-sm break-words text-destructive" as const;

/** The output path is where an operator looks next, so it is shown whole and stays copyable. */
export const EXPERIMENT_OUTPUT_PATH = "break-all text-sm text-muted-foreground" as const;

export const EXPERIMENT_FOOTER =
    "flex-wrap justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground" as const;
