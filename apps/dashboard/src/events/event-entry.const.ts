export const EVENT_ENTRY =
    "group grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-4 border-b px-6 py-4 last:border-b-0" as const;

export const EVENT_TIME =
    "pt-0.5 text-sm whitespace-nowrap tabular-nums text-muted-foreground" as const;

export const EVENT_MARKER = "flex flex-col items-center self-stretch pt-1.5" as const;

export const EVENT_MARKER_DOT = "size-2 flex-none rounded-full bg-primary" as const;

export const EVENT_MARKER_LINE = "mt-1 w-px flex-1 bg-border group-last:hidden" as const;

export const EVENT_BODY = "flex min-w-0 flex-col gap-2" as const;

export const EVENT_TYPE = "text-sm font-medium break-words capitalize" as const;

export const EVENT_HEADLINE = "text-sm leading-relaxed text-muted-foreground" as const;

export const EVENT_PAYLOAD =
    "rounded-xl bg-muted/50 p-3 pr-12 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground" as const;

export const EVENT_PAYLOAD_COPY = "absolute top-1.5 right-1.5" as const;

/** What the copy button on an event payload announces to the operator. */
export const COPY_EVENT_PAYLOAD_LABEL = "Copy the event payload" as const;
