export const ANSWER_LABEL = "Answer in your own words" as const;

export const ANSWER_PLACEHOLDER =
    "Hand the resource over, refuse it, or send the agent back to its own hands." as const;

export const ANSWER_CAPABILITY_LABEL = "Answer" as const;

export const ANSWERING_CAPABILITY_LABEL = "Answering" as const;

/** Shown when the daemon is gone, which reads nothing like a refusal the operator can act on. */
export const CAPABILITY_UNREACHABLE = "The lab daemon did not answer." as const;

export const ANSWER_FORM = "mt-2 grid gap-2 rounded-xl bg-muted/50 p-3" as const;

export const ANSWER_FORM_LABEL = "text-sm font-medium text-muted-foreground" as const;

export const ANSWER_FORM_ROW = "flex flex-wrap items-end justify-end gap-2" as const;

export const ANSWER_FORM_FIELD = "grid gap-1.5" as const;

export const ANSWER_FORM_FAILURE = "text-sm text-destructive" as const;
