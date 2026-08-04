import type { Translated } from "#src/interface-language/translation-catalog.types";

export const INVESTIGATION_ROSTER_NAMESPACE = "investigation-roster" as const;

export const INVESTIGATION_ROSTER_EN = {
    title: "Investigations",
    description:
        "Every direction the lab is working on. Each one runs its own agents on its own goal.",
    emptyTitle: "The lab is idle",
    emptyDescription:
        "Nothing is being investigated yet. Give the lab a goal and it will start placing bets on where the answer is.",
    unreachable: "The lab daemon did not answer.",
    answered: "The lab answered {{status}}.",
    recents: "Recents",

    /** The card's readings: what an operator checks before deciding to open one. */
    bets: "Bets",
    findings: "Findings confirmed",
    agents: "Agents working",
    blocked: "Waiting on you",
    harnesses: "Harnesses",
    ofTotal: "{{done}} of {{total}}",
    discard: "Discard",

    /** The composer: what the operator hands the lab, and what happens while it is starting. */
    newInvestigation: "New investigation",
    newInvestigationDescription:
        "The lab starts working the moment you hand it a goal. Everything below the goal is optional.",
    goalLabel: "Goal",
    goalPlaceholder: "Find a faster route-planning heuristic than contraction hierarchies",
    goalHint: "One sentence. The director turns it into the bets researchers take.",
    contextLabel: "Context",
    contextPlaceholder: "One thing the agents should know per line",
    contextHint: "Optional. What you already know, one line each.",
    criteriaLabel: "Success criteria",
    criteriaPlaceholder: "One criterion per line",
    criteriaHint: "Optional. What would have to be true for this to be an answer.",
    harnessHint: "Which agent CLIs this investigation rotates through, in the order listed.",
    harnessRequired: "Choose at least one harness to dispatch to.",
    start: "Start investigation",
    starting: "Starting",
    cancel: "Cancel"
};

export const INVESTIGATION_ROSTER_RU = {
    title: "Исследования",
    description:
        "Все направления, над которыми работает лаборатория. У каждого свои агенты и своя цель.",
    emptyTitle: "Лаборатория простаивает",
    emptyDescription:
        "Пока ничего не исследуется. Дайте лаборатории цель, и она начнёт делать ставки на то, где искать ответ.",
    unreachable: "Демон лаборатории не ответил.",
    answered: "Лаборатория ответила {{status}}.",
    recents: "Недавние",

    bets: "Ставки",
    findings: "Подтверждённые находки",
    agents: "Агентов в работе",
    blocked: "Ждёт вас",
    harnesses: "Оболочки",
    ofTotal: "{{done}} из {{total}}",
    discard: "Удалить",

    newInvestigation: "Новое исследование",
    newInvestigationDescription:
        "Лаборатория начинает работу, как только вы дадите ей цель. Всё, что ниже цели, необязательно.",
    goalLabel: "Цель",
    goalPlaceholder: "Найти эвристику планирования маршрутов быстрее contraction hierarchies",
    goalHint: "Одно предложение. Директор превратит его в ставки, которые возьмут исследователи.",
    contextLabel: "Контекст",
    contextPlaceholder: "По одному факту для агентов в строке",
    contextHint: "Необязательно. То, что вы уже знаете, по строке на пункт.",
    criteriaLabel: "Критерии успеха",
    criteriaPlaceholder: "По одному критерию в строке",
    criteriaHint: "Необязательно. Что должно быть верно, чтобы считать это ответом.",
    harnessHint:
        "Через какие CLI-агенты исследование работает по очереди, в перечисленном порядке.",
    harnessRequired: "Выберите хотя бы одну оболочку для запуска.",
    start: "Начать исследование",
    starting: "Запуск",
    cancel: "Отмена"
} satisfies Translated<typeof INVESTIGATION_ROSTER_EN>;
