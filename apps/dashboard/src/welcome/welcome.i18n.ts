import type { Translated } from "#src/interface-language/translation-catalog.types";

export const WELCOME_NAMESPACE = "welcome" as const;

export const WELCOME_EN = {
    title: "This is a laboratory, not a chat",
    lead: "You set a goal. From there the lab works on its own.",
    director: "Director",
    directorWork: "reads the field and places a few bets on where the answer might be hiding.",
    researcher: "Researchers",
    researcherWork:
        "take one bet each, at the same time and blind to each other: they write code, install what they need and run the experiment to the end.",
    verifier: "Verifier",
    verifierWork:
        "takes every claim and checks it from scratch, on a different harness, in a clean session.",
    outcome:
        "What survives that is a breakthrough: the lab stops and shows it. Everything else is a bet closed honestly.",
    hours: "A cycle runs for hours. You can close this tab.",
    continue: "Continue",
    skip: "Skip the introduction"
};

export const WELCOME_RU = {
    title: "Это лаборатория, а не чат",
    lead: "Ты ставишь цель. Дальше лаборатория работает сама.",
    director: "Директор",
    directorWork: "изучает область и делает несколько ставок — где решение может прятаться.",
    researcher: "Исследователи",
    researcherWork:
        "берут по ставке, одновременно и ничего не зная друг о друге: пишут код, ставят себе инструменты и доводят эксперимент до конца.",
    verifier: "Верификатор",
    verifierWork:
        "берёт каждое заявление и проверяет его с нуля, другим харнессом, в чистой сессии.",
    outcome:
        "Что это выдержало — прорыв: лаборатория останавливается и показывает его. Всё остальное — честно закрытая ставка.",
    hours: "Цикл идёт часами. Вкладку можно закрыть.",
    continue: "Дальше",
    skip: "Пропустить знакомство"
} satisfies Translated<typeof WELCOME_EN>;
