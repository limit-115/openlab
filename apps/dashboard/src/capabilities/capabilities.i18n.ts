import type { Translated } from "#src/interface-language/translation-catalog.types";

export const CAPABILITIES_NAMESPACE = "capabilities" as const;

export const CAPABILITIES_EN = {
    requests: "Capability requests",

    /** What the card says about a request while it is still standing. */
    blocking: "Direction is stalled",
    waiting: "Waiting for you · {{waited}}",
    requested: "Requested {{at}}",
    answered: "Answered {{at}}",

    unblocks: "What this unblocks",
    whatItTried: "What it tried on its own",
    nothingTried: "Raised by the daemon; nothing was attempted.",
    howToProvide: "How to provide it",
    viaCli: "Or from the CLI",
    copyCommand: "Copy the provisioning command",
    yourAnswer: "Your answer",

    answerLabel: "Answer in your own words",
    answerPlaceholder:
        "Hand the resource over, refuse it, or send the agent back to its own hands.",
    answer: "Answer",
    answering: "Answering",
    unreachable: "The lab daemon did not answer.",
    refused: "The lab refused with {{status}}."
};

export const CAPABILITIES_RU = {
    requests: "Запросы возможностей",

    blocking: "Направление застопорилось",
    waiting: "Ждёт вас · {{waited}}",
    requested: "Запрошено {{at}}",
    answered: "Отвечено {{at}}",

    unblocks: "Что это разблокирует",
    whatItTried: "Что агент пробовал сам",
    nothingTried: "Поднято демоном, ничего не пробовали.",
    howToProvide: "Как это выдать",
    viaCli: "Или из CLI",
    copyCommand: "Скопировать команду выдачи",
    yourAnswer: "Ваш ответ",

    answerLabel: "Ответьте своими словами",
    answerPlaceholder: "Передайте ресурс, откажите или отправьте агента разбираться самому.",
    answer: "Ответить",
    answering: "Отправка",
    unreachable: "Демон лаборатории не ответил.",
    refused: "Лаборатория отказала с кодом {{status}}."
} satisfies Translated<typeof CAPABILITIES_EN>;
