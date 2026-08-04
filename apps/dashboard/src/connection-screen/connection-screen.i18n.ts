import type { Translated } from "#src/interface-language/translation-catalog.types";

export const CONNECTION_SCREEN_NAMESPACE = "connection-screen" as const;

/** The two screens that stand in for a page the dashboard cannot draw yet, or at all. */
export const CONNECTION_SCREEN_EN = {
    loadingTitle: "Connecting to the lab",
    loadingDescription: "Reading the current frontier and opening the live event stream…",
    errorTitle: "Could not read investigation status",
    retry: "Retry connection",
    retrying: "Retrying…"
};

export const CONNECTION_SCREEN_RU = {
    loadingTitle: "Подключение к лаборатории",
    loadingDescription: "Читаем текущий фронт работ и открываем поток событий…",
    errorTitle: "Не удалось прочитать состояние исследования",
    retry: "Повторить подключение",
    retrying: "Повтор…"
} satisfies Translated<typeof CONNECTION_SCREEN_EN>;
