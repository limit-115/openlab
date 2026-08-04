export const INVESTIGATIONS_ENDPOINT = "/api/investigations" as const;

/** The lab's own stream: one message, carrying the whole roster, whenever any of it moves. */
export const ROSTER_STREAM_URL = "/api/events" as const;

export const RosterStreamEvent = {
    ROSTER: "roster"
} as const;

/** How many the sidebar lists before the roster itself is the better place to look. */
export const RECENTS_SHOWN = 10 as const;
/** A goal is a sentence, so the sidebar clips it and hands the whole one back on hover. */
export const RECENT_GOAL = "truncate" as const;

export const ROSTER_PAGE = "grid gap-6" as const;
export const ROSTER_HEADER = "grid gap-1" as const;
export const ROSTER_TITLE_TEXT = "text-xl font-semibold" as const;
export const ROSTER_DESCRIPTION_TEXT = "text-sm text-muted-foreground" as const;
export const ROSTER_LIST = "grid gap-4" as const;

export const CARD =
    "flex flex-col gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary/40" as const;
export const CARD_HEADER = "flex flex-wrap items-start justify-between gap-x-6 gap-y-2" as const;
export const CARD_GOAL = "text-base font-medium underline-offset-4 hover:underline" as const;
export const CARD_STATE = "flex items-center gap-2 text-sm font-medium" as const;
export const CARD_READINGS = "flex flex-wrap items-center gap-x-6 gap-y-1 text-sm" as const;
export const CARD_READING_LABEL = "text-muted-foreground" as const;
export const CARD_FOOTER =
    "flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground" as const;

/** The composer is as tall as the viewport allows and scrolls its fields, never the page. */
export const COMPOSER_DIALOG = "flex max-h-[calc(100dvh-4rem)] flex-col gap-5 sm:max-w-xl" as const;

export const FORM = "flex min-h-0 flex-1 flex-col gap-5" as const;
export const FORM_FIELDS = "grid min-h-0 gap-5 overflow-y-auto" as const;
export const FORM_FIELD = "grid gap-2" as const;
export const FORM_LABEL = "text-sm font-medium" as const;
export const FORM_HINT = "text-sm text-muted-foreground" as const;
export const FORM_ROW = "flex flex-wrap items-center justify-end gap-3" as const;
export const FORM_FAILURE = "text-sm text-destructive" as const;

/** A legend sits outside the fieldset's content box, so it carries its own spacing. */
export const HARNESS_LEGEND = "mb-2 text-sm font-medium" as const;
export const HARNESS_OPTIONS = "grid gap-1" as const;
export const HARNESS_OPTION =
    "flex items-center gap-3 rounded-2xl bg-input/40 px-3 py-2.5 transition-colors hover:bg-input/70" as const;
export const HARNESS_OPTION_NAME = "flex-1 cursor-pointer text-sm font-medium" as const;
