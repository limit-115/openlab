import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { NotifiableEventType } from "@openlab/protocol/operator-notifications/notifiable-event.const";
import { NotificationLanguage } from "@openlab/protocol/operator-notifications/notification-channel.const";

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
    /**
     * What the lab says back in a chat it is being answered through. An answer that reached the
     * agent that asked and one that went nowhere look identical from a chat, and the operator has
     * already put the phone down, so the lab says which of the two it was.
     */
    readonly answerTakenTitle: string;
    readonly answerTakenBody: string;
    readonly nothingAskedTitle: string;
    readonly nothingAskedBody: string;
    readonly severalAskedTitle: string;
    readonly severalAskedBody: string;
    readonly waitingOn: string;
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
    testBody: "This is the lab checking it can reach you. Nothing has happened.",
    answerTakenTitle: "The lab has your answer",
    answerTakenBody: "It is going back to work on this.",
    nothingAskedTitle: "The lab is not waiting on anything",
    nothingAskedBody:
        "Nothing was asked, so nothing was done with this. The lab reads a message here only as an answer to something it asked.",
    severalAskedTitle: "The lab is waiting on more than one thing",
    severalAskedBody:
        "Reply to the message you are answering, so the answer reaches the agent that asked rather than whichever asked first.",
    waitingOn: "Waiting on"
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
    testBody: "Лаборатория проверяет, что может до вас достучаться. Ничего не произошло.",
    answerTakenTitle: "Ответ у лаборатории",
    answerTakenBody: "Она возвращается к работе над этим.",
    nothingAskedTitle: "Лаборатория ничего не ждёт",
    nothingAskedBody:
        "Вопроса не было, поэтому с этим ничего не сделано. Сообщение здесь лаборатория читает только как ответ на то, о чём спросила сама.",
    severalAskedTitle: "Лаборатория ждёт сразу несколько ответов",
    severalAskedBody:
        "Ответьте на то сообщение, которое отвечаете, — тогда ответ дойдёт до агента, который спрашивал, а не до того, кто спросил первым.",
    waitingOn: "Ждёт"
};

export const NOTIFICATION_PHRASES: Record<NotificationLanguage, NotificationPhrases> = {
    [NotificationLanguage.EN]: EN,
    [NotificationLanguage.RU]: RU
};

/** The fields a lab moment carries its own prose in, which differ by the moment. */
export const NotificationPayloadField = {
    REQUEST_ID: "request_id",
    NEED: "need",
    REASON: "reason",
    ERROR: "error",
    HARNESS: "harness"
} as const;
