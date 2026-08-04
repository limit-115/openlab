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

export const EFFORT_LABEL = "Reasoning effort" as const;
export const MODEL_PLACEHOLDER = "Harness default" as const;
export const MODEL_HINT =
    "Leave a model empty to let the harness choose. Vendors share no model names, so each one is named on its own." as const;

export const SAVE_LABEL = "Save settings" as const;
export const SAVING_LABEL = "Saving" as const;
export const SAVE_FAILURE_LABEL = "The lab refused these settings." as const;
export const SETTINGS_PENDING_LABEL = "Reading the settings" as const;
export const NO_SETTINGS_TITLE = "This runtime does not serve the settings" as const;
export const NO_SETTINGS_DESCRIPTION =
    "It is running every role on its harness default. A daemon built with the settings store serves them here." as const;

export const SETTINGS_FORM = "grid gap-6" as const;
export const SETTINGS_FIELD = "grid gap-2" as const;
export const SETTINGS_LABEL = "text-sm font-medium" as const;
export const SETTINGS_HINT = "text-sm text-muted-foreground" as const;
export const SETTINGS_FAILURE = "text-sm text-destructive" as const;
export const SETTINGS_ACTIONS = "flex flex-wrap items-center justify-end gap-3" as const;
export const SETTINGS_PENDING = "flex items-center gap-2 text-sm text-muted-foreground" as const;

/** A legend sits outside the fieldset's content box, so it carries its own spacing. */
export const ROSTER_LEGEND = "mb-2 text-sm font-medium" as const;
export const ROSTER_OPTIONS = "grid gap-1" as const;
export const ROSTER_OPTION =
    "flex items-center gap-3 rounded-2xl bg-input/40 px-3 py-2.5 transition-colors hover:bg-input/70" as const;
export const ROSTER_OPTION_NAME = "flex-1 cursor-pointer text-sm font-medium" as const;

export const ROLE_LIST = "grid gap-3" as const;
export const ROLE_CARD = "grid gap-4 rounded-3xl bg-input/40 px-4 py-4" as const;
export const ROLE_HEADER = "flex flex-wrap items-center justify-between gap-x-6 gap-y-3" as const;
export const ROLE_NAME = "text-sm font-medium capitalize" as const;
export const ROLE_EFFORT = "flex flex-wrap items-center gap-2" as const;
export const ROLE_EFFORT_LABEL = "text-sm text-muted-foreground" as const;
export const ROLE_MODELS = "grid gap-3 sm:grid-cols-3" as const;
export const ROLE_MODEL_FIELD = "grid gap-1.5" as const;
export const ROLE_MODEL_LABEL = "text-sm text-muted-foreground" as const;
