import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";

/**
 * The lifecycle names its states in capitals, which on the page reads as shouting. They are written
 * out here instead: a text transform cannot lower the rest of a word, only raise its first letter.
 */
export const INVESTIGATION_STATE_LABEL: Record<InvestigationState, string> = {
    [InvestigationState.RUNNING]: "Running",
    [InvestigationState.HIBERNATING]: "Hibernating",
    [InvestigationState.BREAKTHROUGH]: "Breakthrough",
    [InvestigationState.FAILED]: "Failed",
    [InvestigationState.STOPPED]: "Stopped"
};

export const STATE_DOT = "size-2 flex-none rounded-full" as const;

/** One colour per state, the same one wherever the state is shown. */
export const STATE_DOT_TONE: Record<InvestigationState, string> = {
    [InvestigationState.RUNNING]: "bg-primary ring-4 ring-primary/20",
    [InvestigationState.BREAKTHROUGH]: "bg-success",
    [InvestigationState.HIBERNATING]: "bg-warning",
    [InvestigationState.FAILED]: "bg-destructive ring-4 ring-destructive/20",
    [InvestigationState.STOPPED]: "bg-muted-foreground"
};
