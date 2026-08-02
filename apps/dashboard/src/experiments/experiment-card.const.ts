import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";

export const EXPERIMENT_LIST = "gap-3" as const;

export const EXPERIMENT_STATUS = "size-8 rounded-xl border" as const;

export const EXPERIMENT_STATUS_TONE: Record<ExperimentStatus, string> = {
    [ExperimentStatus.PLANNED]: "text-muted-foreground",
    [ExperimentStatus.RUNNING]: "border-primary/40 bg-primary/10 text-primary",
    [ExperimentStatus.SUCCEEDED]: "text-foreground",
    [ExperimentStatus.FAILED]: "border-destructive/40 text-destructive",
    [ExperimentStatus.TIMED_OUT]: "border-destructive/40 text-destructive",
    [ExperimentStatus.CANCELLED]: "border-destructive/40 text-destructive"
};

export const EXPERIMENT_HYPOTHESIS = "text-base" as const;

export const EXPERIMENT_COMMAND =
    "mt-2 flex min-w-0 items-center gap-2 rounded-xl bg-muted/50 px-3 py-2" as const;

export const EXPERIMENT_COMMAND_TEXT = "font-mono text-sm break-all" as const;

export const EXPERIMENT_FOOTER =
    "flex-wrap justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground" as const;
