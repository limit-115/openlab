import { HarnessReadinessState } from "@openlab/protocol/harness-readiness/harness-readiness.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";

export const HARNESS_SETUP_NAMESPACE = "harness-setup" as const;

export const HARNESS_SETUP_EN = {
    title: "Give the lab something to think with",
    lead: "The lab has no model of its own. It drives the coding CLIs you already pay for, on this machine, under your own subscription.",
    noKeys: "Subscriptions are the way to run this. A plan you already bought costs the same whether the lab works for ten minutes or all night. Two harnesses do not work that way — DeepSeek and Muse Code are billed by the token, and their cards say so.",
    enough: "One is enough to start. A second is what lets the lab check its own work — a claim only counts once a different vendor reproduces it.",

    billingUsage: "BILLING USAGE",
    billingUsageNote:
        "This one spends money while it runs. There is no cap: an investigation left working overnight bills every token it writes. Stopping the investigation is what stops the spending.",
    billingUsageDeepseek:
        "An agent already running was handed the key and keeps it, so forgetting the key only holds back the runs that have not started.",
    billingUsageMuse:
        "Meta publishes no balance and the CLI reports no token counts, so the lab cannot show you what a run has cost while it is running — only Meta's billing can, afterwards. The lab runs the tier Meta does not train on; the cheaper tier is paid for with your prompts and your code.",

    [HarnessReadinessState.READY]: "Ready",
    [HarnessReadinessState.NOT_INSTALLED]: "Not installed",
    [HarnessReadinessState.NOT_SIGNED_IN]: "Signed out",
    [HarnessReadinessState.UNREADABLE]: "Could not check",

    installCodex: "Install it, then sign in with the ChatGPT plan you already have.",
    installClaude: "Install it, then sign in with the Claude plan you already have.",
    installGlm:
        "GLM speaks through the Claude CLI, so this is the same install as Claude. Doing it once covers both.",
    installDeepseek:
        "DeepSeek speaks through the Codex CLI, so this is the same install as Codex. Doing it once covers both.",
    installMuse:
        "Meta's installer puts the muse launcher on your PATH. It replaces itself whenever a release lands; the lab holds that still for as long as a run lasts, so updating stays yours to do.",

    signInCodex: "Choose the ChatGPT login when it asks.",
    signInClaude: "Choose the claude.ai login when it asks.",
    signInGlm:
        "This plan is signed in through ZCode rather than a terminal: open ZCode, sign in with Z.ai, and bind the GLM Coding Plan.",
    signInDeepseek:
        "DeepSeek has no login, only a key. Create one at platform.deepseek.com and paste it here — the lab keeps it on this machine and never shows it again.",
    signInMuse:
        "Approve the code in the browser when it asks. There is no plan to choose: Muse Code sells none, so the login only settles whose account Meta bills.",

    deepseekKeyLabel: "DeepSeek API key",
    deepseekKeyPlaceholder: "sk-…",
    deepseekKeySave: "Give the lab this key",
    deepseekKeySaving: "Storing",
    deepseekKeyForget: "Forget the key",
    deepseekKeyHeld:
        "The lab is holding a key. It is not shown again — replace it by pasting another.",
    deepseekKeyRefused: "The lab could not store that key.",
    deepseekKeyUnknown:
        "The lab could not say whether it is holding a key. Forgetting one is offered anyway, because a key that is there would still be spending.",

    checking: "Running the CLIs to see what is here",
    watching: "This page keeps checking on its own. Install in another window and come back.",
    copyCommand: "Copy the command",
    unreachable: "The lab could not be asked which harnesses are ready.",
    blocked: "Set one up to go on. Until then the lab has nothing to research with."
};

export const HARNESS_SETUP_RU = {
    title: "Дай лаборатории, чем думать",
    lead: "У лаборатории нет своей модели. Она запускает те CLI, за которые ты уже платишь, — на этой машине и по твоей подписке.",
    noKeys: "Правильный способ — подписки. План, который уже куплен, стоит одинаково, работает лаборатория десять минут или всю ночь. Иначе устроены две оболочки: DeepSeek и Muse Code платят по токенам, и на их карточках это написано.",
    enough: "Чтобы начать, хватит одного. Второй нужен, чтобы лаборатория проверяла саму себя: заявление засчитывается, только когда его воспроизводит другой вендор.",

    billingUsage: "BILLING USAGE",
    billingUsageNote:
        "Эта оболочка тратит деньги, пока работает. Потолка нет: исследование, оставленное на ночь, оплачивает каждый написанный токен. Трата прекращается тогда, когда останавливают само исследование.",
    billingUsageDeepseek:
        "Уже запущенный агент получил ключ и держит его, так что забрать ключ значит лишь не дать начаться следующим прогонам.",
    billingUsageMuse:
        "Meta не публикует баланс, а CLI не сообщает количество токенов, так что лаборатория не может показать стоимость прогона, пока он идёт, — это скажет только счёт Meta, потом. Лаборатория запускает тот тариф, на котором Meta не обучается; дешёвый оплачивается твоими промптами и твоим кодом.",

    [HarnessReadinessState.READY]: "Готов",
    [HarnessReadinessState.NOT_INSTALLED]: "Не установлен",
    [HarnessReadinessState.NOT_SIGNED_IN]: "Вход не выполнен",
    [HarnessReadinessState.UNREADABLE]: "Не удалось проверить",

    installCodex: "Установи, потом войди под планом ChatGPT, который у тебя уже есть.",
    installClaude: "Установи, потом войди под планом Claude, который у тебя уже есть.",
    installGlm: "GLM говорит через Claude CLI, так что установка та же самая. Одной хватит на оба.",
    installDeepseek:
        "DeepSeek говорит через Codex CLI, так что установка та же самая. Одной хватит на оба.",
    installMuse:
        "Установщик Meta кладёт лаунчер muse в PATH. Он обновляет себя сам при каждом релизе; лаборатория держит его неподвижным, пока идёт прогон, — обновлять остаётся тебе.",

    signInCodex: "Когда спросит — выбирай вход через ChatGPT.",
    signInClaude: "Когда спросит — выбирай вход через claude.ai.",
    signInGlm:
        "В этот план входят через ZCode, а не через терминал: открой ZCode, войди по Z.ai и привяжи GLM Coding Plan.",
    signInDeepseek:
        "У DeepSeek нет входа, есть только ключ. Создай его на platform.deepseek.com и вставь сюда — лаборатория сохранит его на этой машине и больше не покажет.",
    signInMuse:
        "Когда спросит — подтверди код в браузере. Плана выбирать не нужно: Muse Code их не продаёт, вход лишь решает, чей счёт выставит Meta.",

    deepseekKeyLabel: "Ключ DeepSeek API",
    deepseekKeyPlaceholder: "sk-…",
    deepseekKeySave: "Отдать ключ лаборатории",
    deepseekKeySaving: "Сохраняем",
    deepseekKeyForget: "Забрать ключ",
    deepseekKeyHeld:
        "Лаборатория держит ключ. Показывать его больше не будет — чтобы заменить, вставь другой.",
    deepseekKeyRefused: "Лаборатория не смогла сохранить этот ключ.",
    deepseekKeyUnknown:
        "Лаборатория не смогла сказать, держит ли она ключ. Забрать его всё равно предлагается: если ключ на месте, он продолжает тратить.",

    checking: "Запускаем CLI, чтобы увидеть, что здесь есть",
    watching: "Страница проверяет сама. Ставь в соседнем окне и возвращайся.",
    copyCommand: "Скопировать команду",
    unreachable: "Не удалось спросить лабораторию, какие харнессы готовы.",
    blocked: "Настрой хотя бы один, чтобы продолжить. Пока лаборатории нечем исследовать."
} satisfies Translated<typeof HARNESS_SETUP_EN>;
