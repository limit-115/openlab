/**
 * Both icons occupy the same box and only one of them is scaled up, so the header never reflows
 * when the palette changes and the swap reads as one icon turning into the other.
 */
export const MODE_TOGGLE_SUN =
    "size-5 rotate-0 scale-100 transition-all motion-reduce:transition-none dark:-rotate-90 dark:scale-0" as const;

export const MODE_TOGGLE_MOON =
    "absolute size-5 rotate-90 scale-0 transition-all motion-reduce:transition-none dark:rotate-0 dark:scale-100" as const;
