import type { NotifiableEventType } from "@lab/protocol/operator-notifications/notifiable-event.const";
import { NotificationChannelKind } from "@lab/protocol/operator-notifications/notification-channel.const";
import {
    type ChannelReport,
    channelReporting
} from "@lab/protocol/operator-notifications/notification-channel-reporting";
import type { NotificationSettingsView } from "@lab/protocol/operator-notifications/notification-settings.types";
import { REPORTABLE_MOMENTS } from "#src/operator-notifications/operator-notifications.const";
import type {
    NotificationDefaultsDraft,
    NotificationSettingsDraft,
    NotificationSettingsSubmission,
    TelegramChannelDraft
} from "#src/operator-notifications/operator-notifications.types";

/**
 * A channel nobody has set up yet disagrees with the lab about nothing, and is a conversation from
 * the start: an operator setting one up to hear that the lab is stuck means to answer it there.
 */
const UNCONFIGURED_TELEGRAM: TelegramChannelDraft = {
    enabled: false,
    events: undefined,
    language: undefined,
    botToken: "",
    botTokenStored: false,
    chatId: "",
    answersBack: true
};

/**
 * What the lab holds, as a page can edit it. A channel the lab knows nothing about still gets a
 * card: the operator sets one up by filling it in rather than by adding it from somewhere first.
 */
export function draftFromSettings(settings: NotificationSettingsView): NotificationSettingsDraft {
    const defaults = {
        events: settings.defaults.events,
        language: settings.defaults.language
    };
    const stored = settings.channels.find(
        (channel) => channel.kind === NotificationChannelKind.TELEGRAM
    );
    if (stored === undefined) {
        return { defaults, telegram: UNCONFIGURED_TELEGRAM };
    }
    return {
        defaults,
        telegram: {
            enabled: stored.enabled,
            events: stored.events,
            language: stored.language,
            botToken: "",
            botTokenStored: stored.bot_token_set,
            chatId: stored.chat_id,
            answersBack: stored.answers_back
        }
    };
}

/**
 * What to hand the lab. A channel with no chat to write to is left out of the document entirely,
 * which is how the lab forgets a channel and the credential it was holding for it; a token nobody
 * retyped is left unnamed, which is how the lab keeps the one it already has, and a question the
 * channel did not answer is left unnamed for the same reason: so the lab goes on answering it.
 */
export function settingsSubmission(
    draft: NotificationSettingsDraft
): NotificationSettingsSubmission {
    const { defaults, telegram } = draft;
    const reported = {
        defaults: { events: [...defaults.events], language: defaults.language }
    };
    if (!isConfigured(telegram)) {
        return { ...reported, channels: [] };
    }
    const typed = telegram.botToken.trim();
    return {
        ...reported,
        channels: [
            {
                kind: NotificationChannelKind.TELEGRAM,
                enabled: telegram.enabled,
                chat_id: telegram.chatId.trim(),
                answers_back: telegram.answersBack,
                ...(telegram.events === undefined ? {} : { events: [...telegram.events] }),
                ...(telegram.language === undefined ? {} : { language: telegram.language }),
                ...(typed.length === 0 ? {} : { bot_token: typed })
            }
        ]
    };
}

/** What the channel would actually report, which is the lab's own answer wherever it named none. */
export function channelReport(draft: NotificationSettingsDraft): ChannelReport {
    return channelReporting(draft.telegram, draft.defaults);
}

/** A channel is set up once there is somewhere to write, whatever else is still missing. */
export function isConfigured(telegram: TelegramChannelDraft): boolean {
    return telegram.chatId.trim().length > 0;
}

/** Whether the lab could actually send through it: somewhere to write, a bot to write as, a reason. */
export function isSendable(draft: NotificationSettingsDraft): boolean {
    const { telegram } = draft;
    return (
        isConfigured(telegram) &&
        (telegram.botToken.trim().length > 0 || telegram.botTokenStored) &&
        channelReport(draft).events.length > 0
    );
}

/**
 * Whether the lab would take the document. A lab told to report to nobody is a real answer, so an
 * empty card is offered for saving; a half-filled one is not, because it names a recipient the lab
 * has no way of reaching, and neither is a lab told to report nothing at all, which is the switch
 * beside each channel dressed up as a subscription.
 */
export function isSubmittable(draft: NotificationSettingsDraft): boolean {
    if (draft.defaults.events.length === 0) {
        return false;
    }
    return !isConfigured(draft.telegram) || isSendable(draft);
}

export function changeDefaults(
    draft: NotificationSettingsDraft,
    change: Partial<NotificationDefaultsDraft>
): NotificationSettingsDraft {
    return { ...draft, defaults: { ...draft.defaults, ...change } };
}

export function chooseLabMoment(
    draft: NotificationSettingsDraft,
    moment: NotifiableEventType,
    chosen: boolean
): NotificationSettingsDraft {
    return changeDefaults(draft, { events: withMoment(draft.defaults.events, moment, chosen) });
}

export function changeTelegram(
    draft: NotificationSettingsDraft,
    change: Partial<TelegramChannelDraft>
): NotificationSettingsDraft {
    return { ...draft, telegram: { ...draft.telegram, ...change } };
}

export function chooseChannelMoment(
    draft: NotificationSettingsDraft,
    moment: NotifiableEventType,
    chosen: boolean
): NotificationSettingsDraft {
    return changeTelegram(draft, {
        events: withMoment(channelReport(draft).events, moment, chosen)
    });
}

/**
 * Whether the channel takes the lab's word on which moments it reports. Taking its own starts from
 * what it is reporting right now rather than from everything or from nothing: the operator is
 * looking at that list as they reach for the switch, and it is the one they mean to depart from.
 */
export function followLabMoments(
    draft: NotificationSettingsDraft,
    follows: boolean
): NotificationSettingsDraft {
    return changeTelegram(draft, {
        events: follows ? undefined : [...channelReport(draft).events]
    });
}

export function followLabLanguage(
    draft: NotificationSettingsDraft,
    follows: boolean
): NotificationSettingsDraft {
    return changeTelegram(draft, {
        language: follows ? undefined : channelReport(draft).language
    });
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
    const stored = draftFromSettings(saved);
    return (
        draft.telegram.botToken.trim().length > 0 ||
        draft.defaults.language !== stored.defaults.language ||
        momentsDiffer(draft.defaults.events, stored.defaults.events) ||
        draft.telegram.enabled !== stored.telegram.enabled ||
        draft.telegram.answersBack !== stored.telegram.answersBack ||
        draft.telegram.language !== stored.telegram.language ||
        draft.telegram.chatId.trim() !== stored.telegram.chatId.trim() ||
        momentsDiffer(draft.telegram.events, stored.telegram.events)
    );
}

/** The moments as chosen from the ones the lab offers, so the stored order never drifts. */
function withMoment(
    moments: readonly NotifiableEventType[],
    moment: NotifiableEventType,
    chosen: boolean
): readonly NotifiableEventType[] {
    return REPORTABLE_MOMENTS.filter((candidate) =>
        candidate === moment ? chosen : moments.includes(candidate)
    );
}

/** Following the lab is a setting of its own, so it differs from every list, including its own. */
function momentsDiffer(
    draft: readonly NotifiableEventType[] | undefined,
    stored: readonly NotifiableEventType[] | undefined
): boolean {
    if (draft === undefined || stored === undefined) {
        return draft !== stored;
    }
    return REPORTABLE_MOMENTS.some((moment) => draft.includes(moment) !== stored.includes(moment));
}
