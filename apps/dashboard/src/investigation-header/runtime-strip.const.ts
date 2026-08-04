export const RUNTIME_STRIP = "flex flex-wrap items-center gap-x-5 gap-y-2" as const;

/**
 * Every reading is one line. A dot before a state and a clock before a duration already say which
 * question is being answered, so naming them again only doubled the height of the header.
 */
export const RUNTIME_READING = "flex items-center gap-2" as const;

export const RUNTIME_ICON = "size-4 flex-none text-muted-foreground" as const;

export const RUNTIME_STRIP_VALUE = "text-sm font-medium" as const;

/** How many agents are working is what the uptime is being spent on, so it rides the same line. */
export const RUNTIME_AGENT_COUNT = "text-sm text-muted-foreground" as const;
