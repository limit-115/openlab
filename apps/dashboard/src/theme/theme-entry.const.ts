/** The icons share one box the size of every other entry's icon, so the label lines up with them. */
export const THEME_ENTRY_ICONS =
    "relative flex size-4 shrink-0 items-center justify-center" as const;

/**
 * Both icons occupy the same box and only one of them is scaled up, so the entry never reflows
 * when the palette changes and the swap reads as one icon turning into the other.
 */
export const THEME_ENTRY_SUN =
    "absolute size-4 rotate-0 scale-100 transition-all motion-reduce:transition-none dark:-rotate-90 dark:scale-0" as const;

export const THEME_ENTRY_MOON =
    "absolute size-4 rotate-90 scale-0 transition-all motion-reduce:transition-none dark:rotate-0 dark:scale-100" as const;
