import type { NotifiableEventType } from "@lab/protocol/operator-notifications/notifiable-event.const";
import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import {
    DEFAULT_NOTIFICATION_LANGUAGE,
    DEFAULT_NOTIFIED_EVENTS
} from "@lab/protocol/operator-notifications/notification-settings.const";
import type { NotificationSettingsView } from "@lab/protocol/operator-notifications/notification-settings.types";
import { REPORTABLE_MOMENTS } from "#src/operator-notifications/operator-notifications.const";
import type {
    NotificationSettingsDraft,
    NotificationSettingsSubmission,
    TelegramChannelDraft
} from "#src/operator-notifications/operator-notifications.types";

const UNCONFIGURED_TELEGRAM: TelegramChannelDraft = {
    enabled: false,
    events: DEFAULT_NOTIFIED_EVENTS,
    language: DEFAULT_NOTIFICATION_LANGUAGE,
    botToken: "",
    botTokenStored: false,
    chatId: ""
};

/**
 * What the lab holds, as a page can edit it. A channel the lab knows nothing about still gets a
 * card: the operator sets one up by filling it in rather than by adding it from somewhere first.
 */
export function draftFromSettings(settings: NotificationSettingsView): NotificationSettingsDraft {
    const stored = settings.channels.find(
        (channel) => channel.kind === NotificationChannelKind.TELEGRAM
    );
    if (stored === undefined) {
        return { telegram: UNCONFIGURED_TELEGRAM };
    }
    return {
        telegram: {
            enabled: stored.enabled,
            events: stored.events,
            language: stored.language,
            botToken: "",
            botTokenStored: stored.bot_token_set,
            chatId: stored.chat_id
        }
    };
}

/**
 * What to hand the lab. A channel with no chat to write to is left out of the document entirely,
 * which is how the lab forgets a channel and the credential it was holding for it; a token nobody
 * retyped is left unnamed, which is how the lab keeps the one it already has.
 */
export function settingsSubmission(
    draft: NotificationSettingsDraft
): NotificationSettingsSubmission {
    const { telegram } = draft;
    if (!isConfigured(telegram)) {
        return { channels: [] };
    }
    const typed = telegram.botToken.trim();
    return {
        channels: [
            {
                kind: NotificationChannelKind.TELEGRAM,
                enabled: telegram.enabled,
                events: [...telegram.events],
                language: telegram.language,
                chat_id: telegram.chatId.trim(),
                ...(typed.length === 0 ? {} : { bot_token: typed })
            }
        ]
    };
}

/** A channel is set up once there is somewhere to write, whatever else is still missing. */
export function isConfigured(telegram: TelegramChannelDraft): boolean {
    return telegram.chatId.trim().length > 0;
}

/** Whether the lab could actually send through it: somewhere to write, a bot to write as, a reason. */
export function isSendable(telegram: TelegramChannelDraft): boolean {
    return (
        isConfigured(telegram) &&
        (telegram.botToken.trim().length > 0 || telegram.botTokenStored) &&
        telegram.events.length > 0
    );
}

/**
 * Whether the lab would take the document. A lab told to report to nobody is a real answer, so an
 * empty card is offered for saving; a half-filled one is not, because it names a recipient the lab
 * has no way of reaching.
 */
export function isSubmittable(draft: NotificationSettingsDraft): boolean {
    return !isConfigured(draft.telegram) || isSendable(draft.telegram);
}

export function chooseMoment(
    draft: NotificationSettingsDraft,
    moment: NotifiableEventType,
    chosen: boolean
): NotificationSettingsDraft {
    return changeTelegram(draft, {
        events: REPORTABLE_MOMENTS.filter((candidate) =>
            candidate === moment ? chosen : draft.telegram.events.includes(candidate)
        )
    });
}

export function changeTelegram(
    draft: NotificationSettingsDraft,
    change: Partial<TelegramChannelDraft>
): NotificationSettingsDraft {
    return { telegram: { ...draft.telegram, ...change } };
}

/**
 * Whether the page is holding anything the lab has not been given. A typed token always counts:
 * the page was never shown the stored one, so it cannot tell whether the two are the same, and
 * assuming they are would quietly drop a rotation.
 */
export function hasUnsavedEdits(
    draft: NotificationSettingsDraft,
    saved: NotificationSettingsView
): boolean {
    const stored = draftFromSettings(saved).telegram;
    const { telegram } = draft;
    return (
        telegram.botToken.trim().length > 0 ||
        telegram.enabled !== stored.enabled ||
        telegram.language !== stored.language ||
        telegram.chatId.trim() !== stored.chatId.trim() ||
        REPORTABLE_MOMENTS.some(
            (moment) => telegram.events.includes(moment) !== stored.events.includes(moment)
        )
    );
}
