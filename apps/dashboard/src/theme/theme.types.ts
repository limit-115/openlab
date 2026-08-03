import type { Theme } from "#src/theme/theme.const";

/** The theme as a consumer sees it: the standing choice, and the way to replace it. */
export interface ThemeSelection {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}
