import {
    AgentEffortLevel,
    AgentHarnessKind
} from "@nightlab/protocol/agents/agent-execution.const";
import { AgentRole } from "@nightlab/protocol/agents/agent-role.const";

/** Every harness the lab can run, in the order the rotation follows when they are all chosen. */
export const SELECTABLE_HARNESSES = Object.values(AgentHarnessKind);

/** The roles a cycle spends, in the order it spends them. */
export const SETTABLE_ROLES = Object.values(AgentRole);

export const EFFORT_LEVELS = Object.values(AgentEffortLevel);

/** The two blocks the settings are set through, then the one control that hands them over. */
export const SETTINGS_FORM = "grid gap-4" as const;
export const SETTINGS_FAILURE = "text-sm text-destructive" as const;
/** Takes the place the save was in, so the answer to it lands where the control stood. */
export const SETTINGS_SAVED =
    "flex items-center justify-end gap-1.5 text-sm text-muted-foreground [&_svg]:size-4" as const;
export const SETTINGS_ACTIONS = "flex flex-wrap items-center justify-end gap-3" as const;
export const SETTINGS_PENDING = "flex items-center gap-2 text-sm text-muted-foreground" as const;

/** Harnesses are few and their names are short, so each one is a card of its own width. */
export const ROSTER_CARD = "gap-5" as const;
export const ROSTER_CONTENT = "grid gap-3" as const;
export const ROSTER_OPTIONS = "flex flex-wrap gap-2" as const;
export const ROSTER_OPTION =
    "flex min-w-40 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50" as const;
export const ROSTER_OPTION_CHOSEN = "border-primary/50 bg-primary/10 hover:bg-primary/15" as const;

/**
 * A role against every harness is a matrix, so it is drawn as one: a row per role, a column per
 * thing that role is set to. The rows run the whole card and the heading sits above the rule they
 * start under, so the card's last row is its bottom edge.
 */
export const ROLE_CARD = "gap-5 pb-0" as const;
export const ROLE_TABLE_CONTENT = "border-t px-0" as const;

/** The first and last columns keep the card's own padding, so the rows line up with the heading. */
export const ROLE_TABLE =
    "[&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6" as const;

/**
 * The role and its effort take the width they need. The vendors ask for the same share of the
 * table as each other, so what is left over is split between them evenly however wide it is.
 */
export const MODEL_COLUMN = "w-1/4" as const;

/**
 * The levels are ordered, so one is picked from a list rather than read as five buttons. The floor
 * holds the column steady against the longest level in either language, and filling the cell keeps
 * every role's control the same width down the page.
 */
export const EFFORT_TRIGGER = "w-full min-w-44" as const;
