import { AgentEffortLevel } from "@nightlab/protocol/agents/agent-execution.const";
import { AgentRole } from "@nightlab/protocol/agents/agent-role.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";

export const HARNESS_SETTINGS_NAMESPACE = "harness-settings" as const;

export const HARNESS_SETTINGS_EN = {
    title: "Harnesses",
    description: "Which agent CLIs the lab dispatches to, and what each role runs as on them.",

    rosterLabel: "Roster",
    rosterHint:
        "What a new investigation starts on. It rotates through them in this order, and an investigation that named its own roster keeps it.",
    rosterRequired: "Choose at least one harness to dispatch to.",

    models: "Models",
    roleColumn: "Role",
    [AgentRole.DIRECTOR]: "Director",
    [AgentRole.RESEARCHER]: "Researcher",
    [AgentRole.VERIFIER]: "Verifier",

    effort: "Reasoning effort",
    [AgentEffortLevel.LOW]: "Low",
    [AgentEffortLevel.MEDIUM]: "Medium",
    [AgentEffortLevel.HIGH]: "High",
    [AgentEffortLevel.XHIGH]: "Extra high",
    [AgentEffortLevel.MAX]: "Maximum",

    modelPlaceholder: "Harness default",
    modelHint:
        "Leave a model empty to let the harness choose. Vendors share no model names, so each one is named on its own.",

    save: "Save settings",
    saving: "Saving",
    saved: "The lab is running these",
    saveFailure: "The lab refused these settings.",
    pending: "Reading the settings",
    unsupportedTitle: "This runtime does not serve the settings",
    unsupportedDescription:
        "It is running every role on its harness default. A daemon built with the settings store serves them here."
};

export const HARNESS_SETTINGS_RU = {
    title: "Оболочки",
    description:
        "В какие CLI-агенты лаборатория отправляет работу и на чём каждая роль там выполняется.",

    rosterLabel: "Состав",
    rosterHint:
        "На чём стартует новое исследование. Оно перебирает оболочки в этом порядке, а исследование, назвавшее свой состав, сохраняет его.",
    rosterRequired: "Выберите хотя бы одну оболочку для запуска.",

    models: "Модели",
    roleColumn: "Роль",
    [AgentRole.DIRECTOR]: "Директор",
    [AgentRole.RESEARCHER]: "Исследователь",
    [AgentRole.VERIFIER]: "Проверяющий",

    effort: "Усилия на рассуждение",
    [AgentEffortLevel.LOW]: "Низкие",
    [AgentEffortLevel.MEDIUM]: "Средние",
    [AgentEffortLevel.HIGH]: "Высокие",
    [AgentEffortLevel.XHIGH]: "Очень высокие",
    [AgentEffortLevel.MAX]: "Максимальные",

    modelPlaceholder: "По умолчанию для оболочки",
    modelHint:
        "Оставьте модель пустой, чтобы оболочка выбрала сама. У вендоров нет общих названий моделей, поэтому каждая указывается отдельно.",

    save: "Сохранить настройки",
    saving: "Сохранение",
    saved: "Лаборатория работает с этими",
    saveFailure: "Лаборатория отклонила эти настройки.",
    pending: "Чтение настроек",
    unsupportedTitle: "Эта среда не отдаёт настройки",
    unsupportedDescription:
        "Она выполняет все роли на настройках оболочки по умолчанию. Демон, собранный с хранилищем настроек, отдаёт их здесь."
} satisfies Translated<typeof HARNESS_SETTINGS_EN>;
