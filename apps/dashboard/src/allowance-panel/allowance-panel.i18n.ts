import type { Translated } from "#src/interface-language/translation-catalog.types";

export const HARNESS_ALLOWANCE_NAMESPACE = "harness-allowance" as const;

export const HARNESS_ALLOWANCE_EN = {
    title: "Allowances",
    description:
        "What each harness has left, and how far into it the lab may spend. Drag a limiter to stop the lab dispatching before a window runs out; a run already under way still finishes, and an investigation can be told to spend past the caps. A harness billed by the token carries no window, so it states a balance and takes no limiter.",
    pending: "Asking the vendors what is left",
    emptyTitle: "No allowance readings",
    emptyDescription:
        "The local runtime is not reporting what the harnesses have left, so the lab is dispatching without seeing their allowance.",

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

export const HARNESS_ALLOWANCE_RU = {
    title: "Лимиты",
    description:
        "Сколько осталось у каждой оболочки и до какой отметки лаборатория может это тратить. Перетащите ограничитель, чтобы она перестала отправлять работу раньше, чем окно закончится: уже запущенный агент доработает, а отдельному исследованию можно разрешить тратить дальше ограничителя. У оболочки с оплатой по токенам окна нет — она показывает баланс и ограничителя не принимает.",
    pending: "Спрашиваем у вендоров, сколько осталось",
    emptyTitle: "Нет данных по лимитам",
    emptyDescription:
        "Локальная среда не сообщает, сколько осталось у оболочек, поэтому лаборатория отправляет работу, не видя их лимитов.",

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
} satisfies Translated<typeof HARNESS_ALLOWANCE_EN>;
