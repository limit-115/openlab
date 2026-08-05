/** What the operator can choose. `system` is a standing instruction, not a palette of its own. */
export const Theme = {
    LIGHT: "light",
    DARK: "dark",
    SYSTEM: "system"
} as const;
export type Theme = (typeof Theme)[keyof typeof Theme];

/** What a choice resolves to: the palette actually painted on the document. */
export type PaintedTheme = typeof Theme.LIGHT | typeof Theme.DARK;

/** The dashboard is a dark surface until the operator says otherwise, which `index.html` paints. */
export const DEFAULT_THEME: Theme = Theme.DARK;

export const THEME_STORAGE_KEY = "lab-ui-theme" as const;

/**
 * Scrollbars, form controls and the caret follow `color-scheme` rather than the palette variables,
 * so the scheme has to move with the class or the browser keeps drawing the old theme's chrome.
 */
export const PAINTED_COLOR_SCHEME: Record<PaintedTheme, string> = {
    [Theme.LIGHT]: "scheme-light",
    [Theme.DARK]: "scheme-dark"
};

export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)" as const;

/** Wide enough to hold the longest palette name, so choosing one does not resize the row. */
export const THEME_TRIGGER = "min-w-36" as const;
