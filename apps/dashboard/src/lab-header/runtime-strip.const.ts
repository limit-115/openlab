import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";

export const RUNTIME_STRIP = "flex flex-wrap items-center gap-x-5 gap-y-2" as const;

/**
 * Every reading is one line. A dot before a state and a clock before a duration already say which
 * question is being answered, so naming them again only doubled the height of the header.
 */
export const RUNTIME_READING = "flex items-center gap-2" as const;

export const RUNTIME_ICON = "size-4 flex-none text-muted-foreground" as const;

export const RUNTIME_STRIP_VALUE = "text-sm font-medium" as const;

/**
 * The lifecycle names its states in capitals, which on the page reads as shouting. They are written
 * out here instead: a text transform cannot lower the rest of a word, only raise its first letter.
 */
export const LAB_STATE_LABEL: Record<LabState, string> = {
    [LabState.RUNNING]: "Running",
    [LabState.HIBERNATING]: "Hibernating",
    [LabState.BREAKTHROUGH]: "Breakthrough",
    [LabState.FAILED]: "Failed",
    [LabState.STOPPED]: "Stopped"
};

/** How many agents are working is what the uptime is being spent on, so it rides the same line. */
export const RUNTIME_AGENT_COUNT = "text-sm text-muted-foreground" as const;

export const STATE_DOT = "size-2 flex-none rounded-full" as const;

export const STATE_DOT_TONE: Record<LabState, string> = {
    [LabState.RUNNING]: "bg-primary ring-4 ring-primary/20",
    [LabState.BREAKTHROUGH]: "bg-success",
    [LabState.HIBERNATING]: "bg-warning",
    [LabState.FAILED]: "bg-destructive ring-4 ring-destructive/20",
    [LabState.STOPPED]: "bg-muted-foreground"
};
