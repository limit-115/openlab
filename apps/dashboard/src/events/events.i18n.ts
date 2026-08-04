import type { Translated } from "#src/interface-language/translation-catalog.types";

export const EVENTS_NAMESPACE = "events" as const;

export const EVENTS_EN = {
    title: "Event stream",
    description: "Significant activity",
    live: "Live",
    emptyTitle: "Waiting for significant events",
    emptyDescription: "Research decisions, experiments and lifecycle changes will stream here.",
    copyPayload: "Copy the event payload"
};

export const EVENTS_RU = {
    title: "Поток событий",
    description: "Значимая активность",
    live: "В эфире",
    emptyTitle: "Ожидание значимых событий",
    emptyDescription: "Решения, эксперименты и смены состояния будут появляться здесь.",
    copyPayload: "Скопировать данные события"
} satisfies Translated<typeof EVENTS_EN>;
