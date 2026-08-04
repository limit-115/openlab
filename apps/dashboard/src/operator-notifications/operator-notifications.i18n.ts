import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "@lab/protocol/operator-notifications/notification-channel.const";
import type { Translated } from "#src/interface-language/translation-catalog.types";

export const OPERATOR_NOTIFICATIONS_NAMESPACE = "operator-notifications" as const;

export const OPERATOR_NOTIFICATIONS_EN = {
    title: "Notifications",
    description:
        "Who the lab tells when something needs you. Research runs for hours, so the moments listed here are the ones worth leaving this page for.",

    [NotificationChannelKind.TELEGRAM]: "Telegram",
    telegramDescription:
        "A bot of your own writes to one chat. Create it with @BotFather, then start a chat with it or add it to a group before the lab can write there.",

    enabled: "Send through this channel",
    configuredOff: "Configured, sending nothing",
    configuredOn: "Sending",
    notConfigured: "Not set up",

    botToken: "Bot token",
    botTokenPlaceholder: "123456789:AA…",
    botTokenStored: "A token is stored. Type a new one to replace it; leave it empty to keep it.",
    botTokenHint: "@BotFather gives you this when the bot is created.",
    chatId: "Chat ID",
    chatIdPlaceholder: "-1001234567890",
    chatIdHint:
        "The chat the bot writes to. A group starts with a minus sign; your own chat with the bot is a plain number.",

    moments: "What to tell you about",
    momentsRequired: "Choose at least one moment to be told about.",
    [EventType.BREAKTHROUGH_RECORDED]: "A finding survived verification",
    [EventType.CAPABILITY_REQUESTED]: "The lab needs something it cannot get itself",
    [EventType.INVESTIGATION_FAILED]: "An investigation failed",
    [EventType.INVESTIGATION_HIBERNATED]: "An investigation went to sleep",
    [EventType.HARNESS_PREFLIGHT_FAILED]: "A harness is not ready to dispatch to",

    language: "Language of the messages",
    languageHint: "The lab writes to you in this language whatever this page is set to.",
    [NotificationLanguage.EN]: "English",
    [NotificationLanguage.RU]: "Русский",

    test: "Send a test message",
    testing: "Sending",
    testDelivered: "It arrived. The lab can reach you.",
    testRefused: "Telegram refused it:",
    testFailed: "The lab could not try the channel.",
    testNeedsSaving: "Save the settings first: a test goes through what the lab has stored.",

    save: "Save notifications",
    saving: "Saving",
    saved: "The lab is reporting like this",
    saveFailure: "The lab refused these settings.",
    pending: "Reading the notification settings",
    unsupportedTitle: "This runtime does not serve the notification settings",
    unsupportedDescription:
        "It is telling nobody anything. A daemon built with the notification store serves them here."
};

export const OPERATOR_NOTIFICATIONS_RU = {
    title: "Уведомления",
    description:
        "Кому лаборатория сообщает, когда вы ей нужны. Исследование идёт часами, поэтому здесь перечислено только то, ради чего стоит уйти с этой страницы.",

    [NotificationChannelKind.TELEGRAM]: "Telegram",
    telegramDescription:
        "Ваш собственный бот пишет в один чат. Создайте его через @BotFather, а затем напишите ему или добавьте его в группу — иначе лаборатории будет некуда писать.",

    enabled: "Отправлять через этот канал",
    configuredOff: "Настроен, ничего не отправляет",
    configuredOn: "Отправляет",
    notConfigured: "Не настроен",

    botToken: "Токен бота",
    botTokenPlaceholder: "123456789:AA…",
    botTokenStored:
        "Токен сохранён. Введите новый, чтобы заменить его, или оставьте поле пустым, чтобы сохранить прежний.",
    botTokenHint: "@BotFather выдаёт его при создании бота.",
    chatId: "ID чата",
    chatIdPlaceholder: "-1001234567890",
    chatIdHint:
        "Чат, в который пишет бот. У группы он начинается с минуса, у вашей личной переписки с ботом — обычное число.",

    moments: "О чём сообщать",
    momentsRequired: "Выберите хотя бы один повод для сообщения.",
    [EventType.BREAKTHROUGH_RECORDED]: "Находка прошла проверку",
    [EventType.CAPABILITY_REQUESTED]: "Лаборатории нужно то, что она не достанет сама",
    [EventType.INVESTIGATION_FAILED]: "Исследование сорвалось",
    [EventType.INVESTIGATION_HIBERNATED]: "Исследование уснуло",
    [EventType.HARNESS_PREFLIGHT_FAILED]: "Оболочка не готова принимать работу",

    language: "Язык сообщений",
    languageHint: "Лаборатория пишет вам на этом языке независимо от языка этой страницы.",
    [NotificationLanguage.EN]: "English",
    [NotificationLanguage.RU]: "Русский",

    test: "Отправить тестовое сообщение",
    testing: "Отправка",
    testDelivered: "Дошло. Лаборатория до вас достучится.",
    testRefused: "Telegram отклонил его:",
    testFailed: "Лаборатории не удалось проверить канал.",
    testNeedsSaving: "Сначала сохраните настройки: проверка идёт через то, что хранит лаборатория.",

    save: "Сохранить уведомления",
    saving: "Сохранение",
    saved: "Лаборатория сообщает именно так",
    saveFailure: "Лаборатория отклонила эти настройки.",
    pending: "Чтение настроек уведомлений",
    unsupportedTitle: "Эта среда не отдаёт настройки уведомлений",
    unsupportedDescription:
        "Она никому ничего не сообщает. Демон, собранный с хранилищем уведомлений, отдаёт их здесь."
} satisfies Translated<typeof OPERATOR_NOTIFICATIONS_EN>;
