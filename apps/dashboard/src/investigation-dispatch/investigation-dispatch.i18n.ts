import type { Translated } from "#src/interface-language/translation-catalog.types";

export const INVESTIGATION_DISPATCH_NAMESPACE = "investigation-dispatch" as const;

export const INVESTIGATION_DISPATCH_EN = {
    title: "Dispatch",
    description:
        "Which subscriptions this investigation may put agents on, and whether the lab's spend caps hold it. Changing either gives up the cycle in flight and starts the next one on the answer.",

    harnesses: "Harnesses",
    harnessesHint: "It rotates through them in this order. At least one is needed to dispatch to.",
    harnessesRequired: "Choose at least one harness to dispatch to.",

    pastCaps: "Spend past the caps",
    pastCapsHint:
        "Runs this investigation on whatever the vendors will still serve, ignoring the caps set on the subscriptions. A vendor that has stopped serving still stops it.",

    save: "Save the dispatch",
    saving: "Saving",
    saved: "The lab is dispatching by these",
    saveFailure: "The lab refused this dispatch.",
    pending: "Reading what this dispatches to",
    unsupportedTitle: "This runtime does not serve the dispatch",
    unsupportedDescription:
        "It keeps every investigation on the harnesses it was opened with. A daemon that serves the dispatch lets them be changed here."
};

export const INVESTIGATION_DISPATCH_RU = {
    title: "Отправка работы",
    description:
        "На какие подписки это исследование может ставить агентов и держат ли его ограничители лаборатории. Смена любого из двух прерывает текущий цикл, а следующий стартует уже с ответом лаборатории.",

    harnesses: "Оболочки",
    harnessesHint:
        "Исследование перебирает их в этом порядке. Нужна хотя бы одна, иначе отправлять работу некуда.",
    harnessesRequired: "Выберите хотя бы одну оболочку для запуска.",

    pastCaps: "Тратить мимо ограничителей",
    pastCapsHint:
        "Исследование работает на всём, что вендоры ещё выдают, не оглядываясь на ограничители подписок. Вендор, который перестал обслуживать, всё равно его остановит.",

    save: "Сохранить",
    saving: "Сохранение",
    saved: "Лаборатория работает с этими",
    saveFailure: "Лаборатория отклонила эти настройки.",
    pending: "Читаем, куда отправляется работа",
    unsupportedTitle: "Эта среда не отдаёт настройки отправки",
    unsupportedDescription:
        "Она держит исследование на тех оболочках, с которыми оно было открыто. Демон, который отдаёт их, позволяет менять состав здесь."
} satisfies Translated<typeof INVESTIGATION_DISPATCH_EN>;
