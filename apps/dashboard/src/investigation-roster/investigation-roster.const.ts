export const INVESTIGATIONS_ENDPOINT = "/api/investigations" as const;

/** The lab's own stream: one message, carrying the whole roster, whenever any of it moves. */
export const ROSTER_STREAM_URL = "/api/events" as const;

export const RosterStreamEvent = {
    ROSTER: "roster"
} as const;

export const ROSTER_UNREACHABLE = "The lab daemon did not answer." as const;

export const ROSTER_TITLE = "Investigations" as const;
export const ROSTER_DESCRIPTION =
    "Every direction the lab is working on. Each one runs its own agents on its own goal." as const;

export const NEW_INVESTIGATION_LABEL = "New investigation" as const;
export const NEW_INVESTIGATION_DESCRIPTION =
    "The lab starts working the moment you hand it a goal. Everything below the goal is optional." as const;
export const START_INVESTIGATION_LABEL = "Start investigation" as const;
export const STARTING_INVESTIGATION_LABEL = "Starting" as const;
export const CANCEL_LABEL = "Cancel" as const;
export const DISCARD_INVESTIGATION_LABEL = "Discard" as const;

export const EMPTY_ROSTER_TITLE = "The lab is idle" as const;
export const EMPTY_ROSTER_DESCRIPTION =
    "Nothing is being investigated yet. Give the lab a goal and it will start placing bets on where the answer is." as const;

export const ROSTER_PAGE = "grid gap-6" as const;
export const ROSTER_HEADER = "flex flex-wrap items-end justify-between gap-x-8 gap-y-3" as const;
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

export const BETS_LABEL = "Bets" as const;
export const FINDINGS_LABEL = "Findings confirmed" as const;
export const AGENTS_LABEL = "Agents working" as const;
export const BLOCKED_LABEL = "Waiting on you" as const;
export const HARNESSES_LABEL = "Harnesses" as const;

/** The composer is as tall as the viewport allows and scrolls its fields, never the page. */
export const COMPOSER_DIALOG = "flex max-h-[calc(100dvh-4rem)] flex-col gap-5 sm:max-w-xl" as const;

export const FORM = "flex min-h-0 flex-1 flex-col gap-5" as const;
export const FORM_FIELDS = "grid min-h-0 gap-5 overflow-y-auto" as const;
export const FORM_FIELD = "grid gap-2" as const;
export const FORM_LABEL = "text-sm font-medium" as const;
export const FORM_HINT = "text-sm text-muted-foreground" as const;
export const FORM_ROW = "flex flex-wrap items-center justify-end gap-3" as const;
export const FORM_FAILURE = "text-sm text-destructive" as const;

export const GOAL_LABEL = "Goal" as const;
export const GOAL_PLACEHOLDER =
    "Find a faster route-planning heuristic than contraction hierarchies" as const;
export const GOAL_HINT =
    "One sentence. The director turns it into the bets researchers take." as const;
export const CONTEXT_LABEL = "Context" as const;
export const CONTEXT_PLACEHOLDER = "One thing the agents should know per line" as const;
export const CONTEXT_HINT = "Optional. What you already know, one line each." as const;
export const CRITERIA_LABEL = "Success criteria" as const;
export const CRITERIA_PLACEHOLDER = "One criterion per line" as const;
export const CRITERIA_HINT =
    "Optional. What would have to be true for this to be an answer." as const;
export const HARNESS_LABEL = "Harnesses" as const;
export const HARNESS_HINT =
    "Which agent CLIs this investigation rotates through, in the order listed." as const;
export const HARNESS_REQUIRED = "Choose at least one harness to dispatch to." as const;
/** A legend sits outside the fieldset's content box, so it carries its own spacing. */
export const HARNESS_LEGEND = "mb-2 text-sm font-medium" as const;
export const HARNESS_OPTIONS = "grid gap-1" as const;
export const HARNESS_OPTION =
    "flex items-center gap-3 rounded-2xl bg-input/40 px-3 py-2.5 transition-colors hover:bg-input/70" as const;
export const HARNESS_OPTION_NAME = "flex-1 cursor-pointer text-sm font-medium" as const;

export const DISCARD_TITLE = "Discard this investigation?" as const;
export const DISCARD_CONSEQUENCE =
    "Its bets, findings, verdicts and run directory are deleted. This cannot be undone." as const;
export const DISCARD_CONFIRM_LABEL = "Discard it" as const;
