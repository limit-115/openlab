import type { NotifiableEventType } from "@openlab/protocol/operator-notifications/notifiable-event.const";
import type { NotificationLanguage } from "@openlab/protocol/operator-notifications/notification-channel.const";
import type {
    NotificationSettingsUpdate,
    NotificationSettingsView
} from "@openlab/protocol/operator-notifications/notification-settings.types";

/**
 * What the lab reports, and in what language, wherever a channel did not answer for itself. These
 * are the settings the operator meets first, because setting up a second recipient is usually about
 * where a message goes rather than about disagreeing over what is worth sending.
 */
export interface NotificationDefaultsDraft {
    readonly events: readonly NotifiableEventType[];
    readonly language: NotificationLanguage;
}

/**
 * One Telegram channel while the operator is still filling it in. Every field is allowed to be
 * empty here and nowhere else: an emptied chat is a step on the way to another one, and only saving
 * asks the lab to accept it. The token is what the operator has typed now rather than what the lab
 * holds, so an empty one means "keep the stored one" exactly as it does on the wire.
 *
 * An undefined moment list or language is the channel following the lab rather than a channel with
 * nothing to say, which is why neither is filled in with today's answer while it is being edited.
 */
export interface TelegramChannelDraft {
    readonly enabled: boolean;
    readonly events: readonly NotifiableEventType[] | undefined;
    readonly language: NotificationLanguage | undefined;
    readonly botToken: string;
    readonly botTokenStored: boolean;
    readonly chatId: string;
    /** Whether a reply in that chat answers the lab, which is the operator opening a way in. */
    readonly answersBack: boolean;
}

export interface NotificationSettingsDraft {
    readonly defaults: NotificationDefaultsDraft;
    readonly telegram: TelegramChannelDraft;
}

/**
 * What the lab last answered with, beside what the operator has made of it. The two are taken and
 * replaced together, so the page can always say which of its settings the lab is yet to be given.
 */
export interface NotificationSettingsEdit {
    readonly saved: NotificationSettingsView;
    readonly draft: NotificationSettingsDraft;
}

export type NotificationSettingsSubmission = NotificationSettingsUpdate;
