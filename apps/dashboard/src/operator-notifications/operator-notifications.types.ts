import type { NotifiableEventType } from "@lab/protocol/operator-notifications/notifiable-event.const";
import type { NotificationLanguage } from "@lab/protocol/operator-notifications/notification-channel.const";
import type {
    NotificationSettingsUpdate,
    NotificationSettingsView
} from "@lab/protocol/operator-notifications/notification-settings.types";

/**
 * One Telegram channel while the operator is still filling it in. Every field is allowed to be
 * empty here and nowhere else: an emptied chat is a step on the way to another one, and only saving
 * asks the lab to accept it. The token is what the operator has typed now rather than what the lab
 * holds, so an empty one means "keep the stored one" exactly as it does on the wire.
 */
export interface TelegramChannelDraft {
    readonly enabled: boolean;
    readonly events: readonly NotifiableEventType[];
    readonly language: NotificationLanguage;
    readonly botToken: string;
    readonly botTokenStored: boolean;
    readonly chatId: string;
}

export interface NotificationSettingsDraft {
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
