import { CycleStageState } from "#src/research-cycle/cycle-stage.const";

export const CYCLE_RAIL =
    "grid list-none overflow-hidden rounded-2xl border sm:grid-cols-4" as const;

export const CYCLE_STAGE =
    "flex min-w-0 flex-col gap-1 border-b p-4 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0" as const;

export const CYCLE_STAGE_SURFACE: Record<CycleStageState, string> = {
    [CycleStageState.PENDING]: "",
    [CycleStageState.ACTIVE]: "bg-primary/5",
    [CycleStageState.BLOCKED]: "bg-warning/5",
    [CycleStageState.DONE]: ""
};

export const CYCLE_STAGE_NAME = "text-sm font-medium" as const;

export const CYCLE_STAGE_NAME_TONE: Record<CycleStageState, string> = {
    [CycleStageState.PENDING]: "text-muted-foreground",
    [CycleStageState.ACTIVE]: "text-foreground",
    [CycleStageState.BLOCKED]: "text-foreground",
    [CycleStageState.DONE]: "text-foreground"
};

export const CYCLE_STAGE_NOTE = "text-sm break-words" as const;

export const CYCLE_STAGE_NOTE_TONE: Record<CycleStageState, string> = {
    [CycleStageState.PENDING]: "text-muted-foreground",
    [CycleStageState.ACTIVE]: "text-primary",
    [CycleStageState.BLOCKED]: "text-warning",
    [CycleStageState.DONE]: "text-muted-foreground"
};
