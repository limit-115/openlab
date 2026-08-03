import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";

/** What the section calls itself, which is the lifecycle state that made it worth showing at all. */
export const OUTCOME_TITLE: Record<LabState, string> = {
    [LabState.RUNNING]: "Running lab",
    [LabState.HIBERNATING]: "Hibernating lab",
    [LabState.COMPLETED]: "Verified result",
    [LabState.FAILED]: "Failed lab",
    [LabState.STOPPED]: "Stopped lab"
};

export const OUTCOME_CARD = "rounded-2xl border p-6" as const;

/** The card outline carries the outcome: a finished lab reads calm, a failed one reads adverse. */
export const OUTCOME_SURFACE: Record<LabState, string> = {
    [LabState.RUNNING]: "border-border",
    [LabState.HIBERNATING]: "border-border",
    [LabState.STOPPED]: "border-border",
    [LabState.COMPLETED]: "border-success/40",
    [LabState.FAILED]: "border-destructive/40"
};

export const OUTCOME_SUMMARY = "text-sm leading-relaxed text-balance" as const;

export const OUTCOME_LIMITATIONS_HEADING =
    "mb-2 text-sm font-medium text-muted-foreground" as const;

export const OUTCOME_LIMITATIONS_LIST =
    "grid list-disc gap-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-border" as const;

export const ARTIFACT_LINKS = "mt-6 flex list-none flex-wrap gap-2" as const;

export const ARTIFACT_LINK =
    "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm break-all text-muted-foreground" as const;
