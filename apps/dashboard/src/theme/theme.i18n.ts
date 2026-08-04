import { Theme } from "#src/theme/theme.const";

export const THEME_NAMESPACE = "theme" as const;

export const THEME_EN = {
    label: "Theme",
    [Theme.LIGHT]: "Light",
    [Theme.DARK]: "Dark",
    [Theme.SYSTEM]: "System"
} satisfies Record<Theme | "label", string>;

export const THEME_RU = {
    label: "Тема",
    [Theme.LIGHT]: "Светлая",
    [Theme.DARK]: "Тёмная",
    [Theme.SYSTEM]: "Системная"
} satisfies typeof THEME_EN;
