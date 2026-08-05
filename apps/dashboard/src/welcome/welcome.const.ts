export const WELCOME_ROUTE = "/welcome" as const;

/**
 * That this browser has been shown the lab, kept where the palette and the language are kept.
 * Being introduced is something that happened to a person, not something the lab was configured
 * with: what the introduction sets up along the way — the roster, the channel — is written to the
 * lab itself by the pages that own it, and stays there for whoever opens it next.
 */
export const WELCOME_STORAGE_KEY = "lab-ui-welcome" as const;

/** Written rather than read: any value means the same thing, and the key's absence is the answer. */
export const WELCOME_SEEN = "seen" as const;

/** The first screen holds itself to what fits without scrolling, so nothing important is below. */
export const WELCOME_SCREEN =
    "mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center gap-8 px-6 py-12" as const;
export const WELCOME_HEADER = "flex items-start justify-between gap-4" as const;
export const WELCOME_TITLE = "text-3xl font-semibold text-balance" as const;
export const WELCOME_LEAD = "text-lg text-muted-foreground" as const;
export const WELCOME_CYCLE = "grid gap-4" as const;
export const WELCOME_ROLE = "grid gap-1" as const;
export const WELCOME_ROLE_NAME = "font-medium" as const;
export const WELCOME_ROLE_WORK = "text-muted-foreground" as const;
export const WELCOME_OUTCOME = "border-l-2 border-primary/40 pl-4 text-pretty" as const;
export const WELCOME_ACTIONS = "flex flex-wrap items-center gap-3" as const;
export const WELCOME_LANGUAGES = "flex shrink-0 items-center gap-1" as const;
