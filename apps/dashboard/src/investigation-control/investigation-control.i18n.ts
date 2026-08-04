import type { Translated } from "#src/interface-language/translation-catalog.types";

export const INVESTIGATION_CONTROL_NAMESPACE = "investigation-control" as const;

/**
 * What each control says, and what it says instead while the daemon is applying it. The pending
 * word replaces the label in place, so it has to read as the same control mid-transition.
 */
export const INVESTIGATION_CONTROL_EN = {
    pause: "Pause",
    pausing: "Pausing",
    wake: "Wake",
    waking: "Waking",
    resume: "Resume",
    resuming: "Resuming",
    start: "Start",
    starting: "Starting",
    stop: "Stop",
    stopping: "Stopping",

    /** The one control that cannot be walked back asks first. */
    stopTitle: "Stop the run?",
    stopConsequence:
        "The agents are cancelled and whatever they had in hand is lost. The investigation settles as stopped and keeps everything it already proved, so you can start it again from here.",
    stopConfirm: "Stop the run",
    keepRunning: "Keep running",

    unreachable: "The lab daemon did not answer.",
    refused: "The investigation refused the control with {{status}}."
};

export const INVESTIGATION_CONTROL_RU = {
    pause: "Пауза",
    pausing: "Приостановка",
    wake: "Разбудить",
    waking: "Пробуждение",
    resume: "Продолжить",
    resuming: "Возобновление",
    start: "Запустить",
    starting: "Запуск",
    stop: "Остановить",
    stopping: "Остановка",

    stopTitle: "Остановить прогон?",
    stopConsequence:
        "Агенты отменяются, и всё, что было у них в работе, теряется. Исследование останавливается и сохраняет всё, что уже доказано, так что его можно запустить снова отсюда.",
    stopConfirm: "Остановить прогон",
    keepRunning: "Пусть работает",

    unreachable: "Демон лаборатории не ответил.",
    refused: "Исследование отклонило команду с кодом {{status}}."
} satisfies Translated<typeof INVESTIGATION_CONTROL_EN>;

/** A control names its words by key, so the presentation carries no copy of its own. */
export type InvestigationControlMessage = keyof typeof INVESTIGATION_CONTROL_EN;
