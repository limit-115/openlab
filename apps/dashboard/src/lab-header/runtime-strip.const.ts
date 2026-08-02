import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";

export const RUNTIME_STRIP = "flex flex-wrap items-center gap-x-6 gap-y-3" as const;

export const RUNTIME_STRIP_LABEL = "text-sm text-muted-foreground" as const;

export const RUNTIME_STRIP_VALUE = "text-sm font-medium capitalize" as const;

export const STATE_DOT = "size-2 flex-none rounded-full" as const;

export const STATE_DOT_TONE: Record<LabState, string> = {
    [LabState.RUNNING]: "bg-primary ring-4 ring-primary/20",
    [LabState.COMPLETED]: "bg-primary",
    [LabState.HIBERNATING]: "bg-muted-foreground",
    [LabState.FAILED]: "bg-destructive ring-4 ring-destructive/20",
    [LabState.STOPPED]: "bg-muted-foreground"
};
