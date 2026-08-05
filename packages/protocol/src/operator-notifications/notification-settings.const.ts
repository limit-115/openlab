import { NOTIFIABLE_EVENT_TYPES } from "#src/operator-notifications/notifiable-event.const";
import { NotificationLanguage } from "#src/operator-notifications/notification-channel.const";

/**
 * A channel nobody narrowed reports every moment the lab considers worth a message. The list is
 * short by construction, so the useful default is all of it: an operator who wants less says so,
 * and one who says nothing is never left wondering which of these the lab decided to keep quiet.
 */
export const DEFAULT_NOTIFIED_EVENTS = [...NOTIFIABLE_EVENT_TYPES];

/** The lab's own source language, which is what it writes in until the operator names another. */
export const DEFAULT_NOTIFICATION_LANGUAGE = NotificationLanguage.EN;

export const NotificationSettingsRefusal = {
    DUPLICATE_CHANNEL: "A channel is configured once",
    DUPLICATE_EVENT: "An event is reported once per channel",
    NO_DEFAULT_EVENTS: "The lab reports at least one event",
    NO_EVENTS: "A channel answering for itself reports at least one event"
} as const;
