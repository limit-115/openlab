export const CLAIM_LIST = "grid list-none" as const;

export const CLAIM_CARD = "flex min-w-0 flex-col gap-3 border-b p-6 last:border-b-0" as const;

/** A claim whose assumption fell keeps its place but stops competing for attention. */
export const CLAIM_CARD_STALE = "opacity-60" as const;

export const CLAIM_HEADER = "flex flex-wrap items-start justify-between gap-3" as const;

export const CLAIM_STATEMENT = "min-w-0 flex-1 text-base leading-snug break-words" as const;

export const CLAIM_TAGS = "flex flex-wrap items-center gap-2" as const;

export const CLAIM_BALANCE = "flex flex-wrap gap-x-4 gap-y-1 text-sm" as const;

export const CLAIM_SUPPORTING = "text-primary tabular-nums" as const;

export const CLAIM_CONTRADICTING = "text-destructive tabular-nums" as const;

export const CLAIM_IDENTIFIERS = "text-sm break-words text-muted-foreground" as const;

export const CLAIM_DISCLOSURE =
    "flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground" as const;

export const CLAIM_DISCLOSURE_CHEVRON =
    "size-4 transition-transform group-data-[state=open]/claim:rotate-90 motion-reduce:transition-none" as const;

export const CLAIM_DISCLOSURE_BODY = "pt-3" as const;

/** What the disclosure promises, so opening it is a decision rather than a guess. */
export const CLAIM_DISCLOSURE_LABEL = "Evidence and the runs behind it" as const;
