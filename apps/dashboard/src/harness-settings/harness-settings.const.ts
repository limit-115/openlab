import { AgentEffortLevel, AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";

export const LAB_SETTINGS_ENDPOINT = "/api/settings";

/** Every harness the lab can run, in the order the rotation follows when they are all chosen. */
export const SELECTABLE_HARNESSES = Object.values(AgentHarnessKind);

/** The roles a cycle spends, in the order it spends them. */
export const SETTABLE_ROLES = Object.values(AgentRole);

export const EFFORT_LEVELS = Object.values(AgentEffortLevel);

export const HARNESS_SETTINGS_TITLE = "Harnesses" as const;
export const HARNESS_SETTINGS_DESCRIPTION =
    "Which agent CLIs the lab dispatches to, and what each role runs as on them." as const;

export const ROSTER_LABEL = "Roster" as const;
export const ROSTER_HINT =
    "What a new investigation starts on. It rotates through them in this order, and an investigation that named its own roster keeps it." as const;
export const ROSTER_REQUIRED = "Choose at least one harness to dispatch to." as const;

export const ROLE_EXECUTION_LABEL = "Roles" as const;
export const ROLE_COLUMN_LABEL = "Role" as const;
export const EFFORT_LABEL = "Reasoning effort" as const;
export const MODEL_PLACEHOLDER = "Harness default" as const;
export const MODEL_HINT =
    "Leave a model empty to let the harness choose. Vendors share no model names, so each one is named on its own." as const;

export const SAVE_LABEL = "Save settings" as const;
export const SAVING_LABEL = "Saving" as const;
export const SAVED_LABEL = "The lab is running these" as const;
export const SAVE_FAILURE_LABEL = "The lab refused these settings." as const;
export const SETTINGS_PENDING_LABEL = "Reading the settings" as const;
export const NO_SETTINGS_TITLE = "This runtime does not serve the settings" as const;
export const NO_SETTINGS_DESCRIPTION =
    "It is running every role on its harness default. A daemon built with the settings store serves them here." as const;

/** The two blocks the settings are set through, then the one control that hands them over. */
export const SETTINGS_FORM = "grid gap-4" as const;
export const SETTINGS_FAILURE = "text-sm text-destructive" as const;
export const SETTINGS_SAVED =
    "flex items-center gap-1.5 text-sm text-muted-foreground [&_svg]:size-4" as const;
export const SETTINGS_ACTIONS = "flex flex-wrap items-center justify-end gap-3" as const;
export const SETTINGS_PENDING = "flex items-center gap-2 text-sm text-muted-foreground" as const;

/** Harnesses are few and their names are short, so each one is a card of its own width. */
export const ROSTER_CONTENT = "grid gap-3" as const;
export const ROSTER_OPTIONS = "flex flex-wrap gap-2" as const;
export const ROSTER_OPTION =
    "flex min-w-40 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50" as const;
export const ROSTER_OPTION_CHOSEN = "border-primary/50 bg-primary/10 hover:bg-primary/15" as const;

/**
 * A role against every harness is a matrix, so it is drawn as one: a row per role, a column per
 * thing that role is set to. The outer cells drop their padding to line the grid up with the card's
 * own edge, and the table keeps a width the columns stay usable at rather than squeezing to fit.
 */
export const ROLE_TABLE =
    "w-full min-w-224 table-fixed [&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0" as const;
export const ROLE_COLUMN = "w-40" as const;
export const ROLE_NAME = "capitalize" as const;

/** Wide enough for the whole scale, so the effort a role runs at is one click away at every row. */
export const EFFORT_COLUMN = "w-80" as const;

/**
 * The chosen level carries the same fill as a ticked box, because the shipped toggle marks it with
 * a shade of grey that is unreadable against the rest of the group.
 */
export const EFFORT_OPTION =
    "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary data-[state=on]:hover:text-primary-foreground" as const;
