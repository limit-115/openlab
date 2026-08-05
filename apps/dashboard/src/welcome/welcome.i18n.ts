import type { Translated } from "#src/interface-language/translation-catalog.types";

export const WELCOME_NAMESPACE = "welcome" as const;

export const WELCOME_EN = {
    progress: "Step {{step}} of {{total}}",
    back: "Back",
    continue: "Continue",
    skip: "Skip setup",
    setUp: "Set the lab up",
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

    notificationsTitle: "Tell the lab where to find you",
    notificationsLead:
        "A cycle runs for hours, and it can stop on something only you can give it. Telegram is the one channel the lab can also be answered through: it asks there, you reply, and an agent goes back to work on what you wrote.",
    notificationsOptional:
        "Skipping this costs nothing but your attention: the lab still works, you just have to come and look.",
    notificationsUnsaved: "Not saved. Until you save it, the lab has nowhere to write.",
    skipStep: "Skip this step",

    goalTitle: "Give it something to find out",
    goalLead:
        "One sentence. The director turns it into the bets the researchers take, and the lab stops when one of them survives verification.",
    goalExamples: "For example",
    goalStart: "Start the investigation",
    goalStarting: "Starting",
    goalFailure: "The lab would not start this investigation.",
    goalLater: "Open the lab",
    goalExampleCompression: "Find a lossless compressor that beats zstd -19 on JSON logs",
    goalExampleSorting:
        "Find a sorting network for 16 inputs with fewer comparators than the best known",
    goalExampleLimiter:
        "Find a rate limiter that holds p99 latency under 5 ms at 50k requests a second"
};

export const WELCOME_RU = {
    progress: "Шаг {{step}} из {{total}}",
    back: "Назад",
    continue: "Дальше",
    skip: "Пропустить настройку",
    setUp: "Настроить лабораторию",
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

    notificationsTitle: "Скажи лаборатории, где тебя искать",
    notificationsLead:
        "Цикл идёт часами и может встать на том, что можешь дать только ты. Telegram — единственный канал, через который лаборатории ещё и отвечают: она спрашивает там, ты пишешь ответ, и агент возвращается к работе уже с ним.",
    notificationsOptional:
        "Пропустить можно: лаборатория всё равно работает, просто заходить смотреть придётся самому.",
    notificationsUnsaved: "Не сохранено. Пока не сохранишь, писать лаборатории некуда.",
    skipStep: "Пропустить шаг",

    goalTitle: "Дай ей, что выяснить",
    goalLead:
        "Одно предложение. Директор превратит его в ставки, которые возьмут исследователи, и лаборатория остановится, когда одна из них выдержит проверку.",
    goalExamples: "Например",
    goalStart: "Запустить исследование",
    goalStarting: "Запускаем",
    goalFailure: "Лаборатория отказалась запускать это исследование.",
    goalLater: "Открыть лабораторию",
    goalExampleCompression: "Найти сжатие без потерь, которое обходит zstd -19 на JSON-логах",
    goalExampleSorting:
        "Найти сортирующую сеть на 16 входов с меньшим числом компараторов, чем лучшая известная",
    goalExampleLimiter:
        "Найти рейт-лимитер, который держит p99 ниже 5 мс при 50 тысячах запросов в секунду"
} satisfies Translated<typeof WELCOME_EN>;
