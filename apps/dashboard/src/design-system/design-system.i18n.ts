import type { Translated } from "#src/interface-language/translation-catalog.types";

export const DESIGN_SYSTEM_NAMESPACE = "design-system" as const;

/**
 * The words the shipped components say on their own: what a control does, said for anything that
 * cannot see it. Nothing here names a feature, which is why they are not in one.
 */
export const DESIGN_SYSTEM_EN = {
    close: "Close",
    loading: "Loading",
    sidebar: "Sidebar",
    sidebarDescription: "Displays the mobile sidebar.",
    toggleSidebar: "Toggle Sidebar"
};

export const DESIGN_SYSTEM_RU = {
    close: "Закрыть",
    loading: "Загрузка",
    sidebar: "Боковая панель",
    sidebarDescription: "Показывает боковую панель на мобильном.",
    toggleSidebar: "Свернуть или развернуть панель"
} satisfies Translated<typeof DESIGN_SYSTEM_EN>;
