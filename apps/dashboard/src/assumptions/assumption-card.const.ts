export const ASSUMPTION_LIST = "grid list-none gap-3" as const;

export const ASSUMPTION_CARD = "flex min-w-0 flex-col gap-3 rounded-2xl border p-4" as const;

/** A bet that produced the run's result is worth spotting from across the page. */
export const ASSUMPTION_CARD_CONFIRMED = "border-success/40" as const;

export const ASSUMPTION_HEADER =
    "flex flex-wrap items-start justify-between gap-x-4 gap-y-2" as const;

export const ASSUMPTION_STATEMENT = "min-w-0 text-base leading-snug font-medium" as const;

export const ASSUMPTION_TAGS = "flex flex-none flex-wrap items-center gap-2" as const;

export const ASSUMPTION_RATIONALE = "text-sm leading-relaxed text-muted-foreground" as const;

/** What came back when the bet was closed, in the words of whoever closed it. */
export const ASSUMPTION_OUTCOME = "text-sm leading-relaxed" as const;

export const ASSUMPTION_META = "flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground";

export const FINDING_LIST = "grid list-none gap-3 border-t pt-3" as const;

export const FINDING_ENTRY = "flex min-w-0 flex-col gap-2" as const;

export const FINDING_CLAIM = "text-sm leading-relaxed font-medium" as const;

export const FINDING_SECTION_LABEL = "text-sm font-medium text-muted-foreground" as const;

export const FINDING_PROSE = "text-sm leading-relaxed whitespace-pre-wrap" as const;

export const FINDING_ARTIFACTS =
    "grid list-none gap-1 text-sm leading-relaxed break-all text-muted-foreground" as const;

export const FINDING_DISCLOSURE =
    "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" as const;

export const FINDING_DISCLOSURE_CHEVRON =
    "size-4 flex-none transition-transform group-data-[state=open]/finding:rotate-90" as const;

export const FINDING_DISCLOSURE_BODY = "grid gap-3 pt-3" as const;
