import type { Translated } from "#src/interface-language/translation-catalog.types";

export const SUBSCRIPTION_ALLOWANCE_NAMESPACE = "subscription-allowance" as const;

export const SUBSCRIPTION_ALLOWANCE_EN = {
    title: "Subscriptions",
    description:
        "What each subscription has left, and how far into it the lab may spend. Drag a limiter to stop the lab dispatching before a window runs out; a run already under way still finishes, and an investigation can be told to spend past the caps.",
    pending: "Asking the vendors what is left",
    emptyTitle: "No subscription readings",
    emptyDescription:
        "The local runtime is not reporting what the subscriptions have left, so the lab is dispatching without seeing their allowance.",

    readAt: "Read at",
    autoRefresh_one: "Refreshes on its own every minute",
    autoRefresh_other: "Refreshes on its own every {{count}} minutes",
    refresh: "Refresh",
    refreshFailure: "The vendors could not be asked again.",

    exhausted: "No allowance left",
    withheld: "Held at your cap",
    used: "{{window}} · {{percent}}% used",
    resets: "resets {{at}}",
    meter: "{{window}} window",

    capStops: "stops at {{percent}}%",
    capNone: "no cap",
    capMeter: "{{window}} spend cap",
    capSave: "Save the caps",
    capSaving: "Saving",
    capSaved: "The lab is dispatching by these",
    capSaveFailure: "The lab refused these caps.",

    /**
     * A window is named in the unit its vendor bills it in. A rolling day is called twenty-four
     * hours rather than one day, because it is the clock that resets and not the calendar.
     */
    windowDay: "24 hours",
    windowDays_one: "{{count}} day",
    windowDays_other: "{{count}} days",
    windowHours_one: "{{count}} hour",
    windowHours_other: "{{count}} hours",
    windowMinutes_one: "{{count}} minute",
    windowMinutes_other: "{{count}} minutes"
};

export const SUBSCRIPTION_ALLOWANCE_RU = {
    title: "Подписки",
    description:
        "Сколько осталось у каждой подписки и до какой отметки лаборатория может её тратить. Перетащите ограничитель, чтобы она перестала отправлять работу раньше, чем окно закончится: уже запущенный агент доработает, а отдельному исследованию можно разрешить тратить дальше ограничителя.",
    pending: "Спрашиваем у вендоров, сколько осталось",
    emptyTitle: "Нет данных по подпискам",
    emptyDescription:
        "Локальная среда не сообщает, сколько осталось у подписок, поэтому лаборатория отправляет работу, не видя их лимитов.",

    readAt: "Считано",
    autoRefresh_one: "Обновляется само каждую минуту",
    autoRefresh_few: "Обновляется само каждые {{count}} минуты",
    autoRefresh_many: "Обновляется само каждые {{count}} минут",
    autoRefresh_other: "Обновляется само каждые {{count}} минут",
    refresh: "Обновить",
    refreshFailure: "Не удалось опросить вендоров повторно.",

    exhausted: "Лимит исчерпан",
    withheld: "Придержана ограничителем",
    used: "{{window}} · использовано {{percent}}%",
    resets: "сброс {{at}}",
    meter: "Окно {{window}}",

    capStops: "останов на {{percent}}%",
    capNone: "без ограничителя",
    capMeter: "Ограничитель расхода, окно {{window}}",
    capSave: "Сохранить ограничители",
    capSaving: "Сохранение",
    capSaved: "Лаборатория работает с этими",
    capSaveFailure: "Лаборатория отклонила эти ограничители.",

    windowDay: "24 часа",
    windowDays_one: "{{count}} день",
    windowDays_few: "{{count}} дня",
    windowDays_many: "{{count}} дней",
    windowDays_other: "{{count}} дней",
    windowHours_one: "{{count}} час",
    windowHours_few: "{{count}} часа",
    windowHours_many: "{{count}} часов",
    windowHours_other: "{{count}} часов",
    windowMinutes_one: "{{count}} минута",
    windowMinutes_few: "{{count}} минуты",
    windowMinutes_many: "{{count}} минут",
    windowMinutes_other: "{{count}} минут"
} satisfies Translated<typeof SUBSCRIPTION_ALLOWANCE_EN>;
