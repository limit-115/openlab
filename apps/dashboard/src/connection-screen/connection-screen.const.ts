export const CENTER_STATE = "flex min-h-screen items-center justify-center p-6" as const;

/**
 * The one screen where the mark stands alone, so it is the mark and not an icon of one: no tile
 * under it, the brand colour on it, and its own accessible name, because nothing else on this
 * screen says which lab is being waited for.
 */
export const CENTER_STATE_MARK = "size-10 text-brand" as const;

export const CENTER_STATE_MARK_ERROR = "bg-destructive/10 text-destructive" as const;
