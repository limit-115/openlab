import { HarnessReadinessState } from "@lab/protocol/harness-readiness/harness-readiness.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";

export const HARNESS_SETUP_NAMESPACE = "harness-setup" as const;

export const HARNESS_SETUP_EN = {
    title: "Give the lab something to think with",
    lead: "The lab has no model of its own. It drives the coding CLIs you already pay for, on this machine, under your own subscription.",
    noKeys: "No API keys. The lab will not take one: metered billing turns a run that works all night into a bill nobody agreed to.",
    enough: "One is enough to start. A second is what lets the lab check its own work — a claim only counts once a different vendor reproduces it.",

    [HarnessReadinessState.READY]: "Ready",
    [HarnessReadinessState.NOT_INSTALLED]: "Not installed",
    [HarnessReadinessState.NOT_SIGNED_IN]: "Signed out",
    [HarnessReadinessState.UNREADABLE]: "Could not check",

    installCodex: "Install it, then sign in with the ChatGPT plan you already have.",
    installClaude: "Install it, then sign in with the Claude plan you already have.",
    installGlm:
        "GLM speaks through the Claude CLI, so this is the same install as Claude. Doing it once covers both.",

    signInCodex: "Choose the ChatGPT login when it asks.",
    signInClaude: "Choose the claude.ai login when it asks.",
    signInGlm:
        "This plan is signed in through ZCode rather than a terminal: open ZCode, sign in with Z.ai, and bind the GLM Coding Plan.",

    checking: "Running the CLIs to see what is here",
    watching: "This page keeps checking on its own. Install in another window and come back.",
    copyCommand: "Copy the command",
    unreachable: "The lab could not be asked which harnesses are ready.",
    blocked: "Set one up to go on. Until then the lab has nothing to research with."
};

export const HARNESS_SETUP_RU = {
    title: "Дай лаборатории, чем думать",
    lead: "У лаборатории нет своей модели. Она запускает те CLI, за которые ты уже платишь, — на этой машине и по твоей подписке.",
    noKeys: "Никаких API-ключей. Лаборатория их не примет: поштучная оплата превращает прогон длиной в ночь в счёт, на который никто не соглашался.",
    enough: "Чтобы начать, хватит одного. Второй нужен, чтобы лаборатория проверяла саму себя: заявление засчитывается, только когда его воспроизводит другой вендор.",

    [HarnessReadinessState.READY]: "Готов",
    [HarnessReadinessState.NOT_INSTALLED]: "Не установлен",
    [HarnessReadinessState.NOT_SIGNED_IN]: "Вход не выполнен",
    [HarnessReadinessState.UNREADABLE]: "Не удалось проверить",

    installCodex: "Установи, потом войди под планом ChatGPT, который у тебя уже есть.",
    installClaude: "Установи, потом войди под планом Claude, который у тебя уже есть.",
    installGlm: "GLM говорит через Claude CLI, так что установка та же самая. Одной хватит на оба.",

    signInCodex: "Когда спросит — выбирай вход через ChatGPT.",
    signInClaude: "Когда спросит — выбирай вход через claude.ai.",
    signInGlm:
        "В этот план входят через ZCode, а не через терминал: открой ZCode, войди по Z.ai и привяжи GLM Coding Plan.",

    checking: "Запускаем CLI, чтобы увидеть, что здесь есть",
    watching: "Страница проверяет сама. Ставь в соседнем окне и возвращайся.",
    copyCommand: "Скопировать команду",
    unreachable: "Не удалось спросить лабораторию, какие харнессы готовы.",
    blocked: "Настрой хотя бы один, чтобы продолжить. Пока лаборатории нечем исследовать."
} satisfies Translated<typeof HARNESS_SETUP_EN>;
