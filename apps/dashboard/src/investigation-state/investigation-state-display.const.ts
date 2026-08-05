import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";

export const STATE_DOT = "size-2 flex-none rounded-full" as const;

/** One colour per state, the same one wherever the state is shown. */
export const STATE_DOT_TONE: Record<InvestigationState, string> = {
    [InvestigationState.RUNNING]: "bg-primary ring-4 ring-primary/20",
    [InvestigationState.BREAKTHROUGH]: "bg-success",
    [InvestigationState.HIBERNATING]: "bg-warning",
    [InvestigationState.FAILED]: "bg-destructive ring-4 ring-destructive/20",
    [InvestigationState.STOPPED]: "bg-muted-foreground"
};
