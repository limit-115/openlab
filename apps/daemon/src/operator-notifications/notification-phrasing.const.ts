import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import type { NotifiableEventType } from "@lab/protocol/operator-notifications/notifiable-event.const";
import { NotificationLanguage } from "@lab/protocol/operator-notifications/notification-channel.const";

/**
 * Everything the lab says to somebody who is not looking at the dashboard. The daemon has no
 * translation catalogue of its own and no way to know what language a recipient reads, so the words
 * live with the code that chooses them and the channel carries the language it was configured with.
 *
 * A title is what shows in a notification list before anything is opened, so it names the moment
 * rather than the investigation: which investigation it was is the first fact under it.
 */
export interface NotificationPhrases {
    readonly titles: Record<NotifiableEventType, string>;
    readonly investigation: string;
    readonly harness: string;
    readonly why: string;
    readonly openInTheLab: string;
    /** Stands in where the lab recorded a moment without saying anything more about it. */
    readonly nothingRecorded: string;
    readonly testTitle: string;
    readonly testBody: string;
}

const EN: NotificationPhrases = {
    titles: {
        [EventType.BREAKTHROUGH_RECORDED]: "Breakthrough",
        [EventType.CAPABILITY_REQUESTED]: "The lab needs something it cannot get itself",
        [EventType.INVESTIGATION_FAILED]: "Investigation failed",
        [EventType.INVESTIGATION_HIBERNATED]: "Investigation went to sleep",
        [EventType.HARNESS_PREFLIGHT_FAILED]: "A harness is not ready to dispatch to"
    },
    investigation: "Investigation",
    harness: "Harness",
    why: "Why",
    openInTheLab: "Open in the lab",
    nothingRecorded: "The lab recorded nothing further about it.",
    testTitle: "Notifications are working",
    testBody: "This is the lab checking it can reach you. Nothing has happened."
};

const RU: NotificationPhrases = {
    titles: {
        [EventType.BREAKTHROUGH_RECORDED]: "Прорыв",
        [EventType.CAPABILITY_REQUESTED]: "Лаборатории нужно то, что она не достанет сама",
        [EventType.INVESTIGATION_FAILED]: "Исследование сорвалось",
        [EventType.INVESTIGATION_HIBERNATED]: "Исследование уснуло",
        [EventType.HARNESS_PREFLIGHT_FAILED]: "Оболочка не готова принимать работу"
    },
    investigation: "Исследование",
    harness: "Оболочка",
    why: "Почему",
    openInTheLab: "Открыть в лаборатории",
    nothingRecorded: "Больше лаборатория ничего об этом не записала.",
    testTitle: "Уведомления работают",
    testBody: "Лаборатория проверяет, что может до вас достучаться. Ничего не произошло."
};

export const NOTIFICATION_PHRASES: Record<NotificationLanguage, NotificationPhrases> = {
    [NotificationLanguage.EN]: EN,
    [NotificationLanguage.RU]: RU
};

/** The fields a lab moment carries its own prose in, which differ by the moment. */
export const NotificationPayloadField = {
    NEED: "need",
    REASON: "reason",
    ERROR: "error",
    HARNESS: "harness"
} as const;
