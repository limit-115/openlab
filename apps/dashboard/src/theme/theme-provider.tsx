import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import {
    DEFAULT_THEME,
    PAINTED_COLOR_SCHEME,
    type PaintedTheme,
    SYSTEM_DARK_QUERY,
    THEME_STORAGE_KEY,
    Theme
} from "#src/theme/theme.const";
import type { ThemeSelection } from "#src/theme/theme.types";

const ThemeContext = createContext<ThemeSelection | null>(null);

/** Anything held over from an older build that is no longer one of the themes falls back. */
function storedTheme(): Theme {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);

    return Object.values(Theme).find((theme) => theme === stored) ?? DEFAULT_THEME;
}

/** The palette hangs off the document element, which is what `.dark` in the stylesheet selects. */
function paint(painted: PaintedTheme) {
    const root = window.document.documentElement;

    root.classList.remove(Theme.LIGHT, Theme.DARK, ...Object.values(PAINTED_COLOR_SCHEME));
    root.classList.add(painted, PAINTED_COLOR_SCHEME[painted]);
}

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(storedTheme);

    useEffect(() => {
        if (theme !== Theme.SYSTEM) {
            paint(theme);
            return;
        }

        // `system` means the dashboard keeps following the machine, including a flip while open.
        const systemDark = window.matchMedia(SYSTEM_DARK_QUERY);
        const followSystem = () => paint(systemDark.matches ? Theme.DARK : Theme.LIGHT);

        followSystem();
        systemDark.addEventListener("change", followSystem);

        return () => systemDark.removeEventListener("change", followSystem);
    }, [theme]);

    const selection: ThemeSelection = {
        theme,
        setTheme: (chosen) => {
            localStorage.setItem(THEME_STORAGE_KEY, chosen);
            setTheme(chosen);
        }
    };

    return <ThemeContext.Provider value={selection}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeSelection {
    const selection = useContext(ThemeContext);

    if (!selection) {
        throw new Error("useTheme must be used within a ThemeProvider.");
    }

    return selection;
}
