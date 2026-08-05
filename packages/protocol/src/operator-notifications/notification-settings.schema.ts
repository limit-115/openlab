import { z } from "zod";
import { NOTIFIABLE_EVENT_TYPES } from "#src/operator-notifications/notifiable-event.const";
import {
    NotificationChannelKind,
    NotificationLanguage
} from "#src/operator-notifications/notification-channel.const";
import {
    DEFAULT_NOTIFICATION_LANGUAGE,
    DEFAULT_NOTIFIED_EVENTS,
    NotificationSettingsRefusal
} from "#src/operator-notifications/notification-settings.const";

function distinct(values: readonly string[]): boolean {
    return new Set(values).size === values.length;
}

/** A choice among the moments the lab offers, which is never the empty one. */
function reportedEvents(emptied: string) {
    return z
        .array(z.enum(NOTIFIABLE_EVENT_TYPES))
        .nonempty(emptied)
        .refine(distinct, NotificationSettingsRefusal.DUPLICATE_EVENT);
}

/**
 * What the lab reports and the language it writes in, for every channel that does not answer for
 * itself. One recipient is the ordinary case, so these are set once here rather than copied into
 * each channel: narrowing what the lab reports then reaches every channel that never disagreed.
 */
export const NotificationDefaultsSchema = z.object({
    events: reportedEvents(NotificationSettingsRefusal.NO_DEFAULT_EVENTS).default([
        ...DEFAULT_NOTIFIED_EVENTS
    ]),
    language: z.enum(NotificationLanguage).default(DEFAULT_NOTIFICATION_LANGUAGE)
});

/**
 * What every channel is set with, whichever vendor carries the message. A channel may answer either
 * question for itself, because two recipients of the same lab are not the same person: one may want
 * only the breakthroughs, in Russian. Leaving one unanswered is not silence about it — it is the
 * channel taking the lab's own answer, and going on taking it as that answer changes.
 */
const NOTIFICATION_CHANNEL_FIELDS = {
    /** Configured and silent is a real answer, so a channel is switched rather than deleted. */
    enabled: z.boolean().default(false),
    events: reportedEvents(NotificationSettingsRefusal.NO_EVENTS).optional(),
    language: z.enum(NotificationLanguage).optional()
};

/**
 * One Telegram bot writing to one chat. The token authenticates as the bot itself rather than for
 * one message, so it is the channel's secret and never leaves the lab once it is stored.
 *
 * The chat may also answer back, which is off until the operator says otherwise. What comes back is
 * carried to an agent as the operator's own words, so whoever can write in that chat is answering
 * for the operator — and a bot added to a group is being read by everybody in it.
 */
export const TelegramChannelSchema = z.object({
    kind: z.literal(NotificationChannelKind.TELEGRAM),
    ...NOTIFICATION_CHANNEL_FIELDS,
    bot_token: z.string().trim().min(1),
    chat_id: z.string().trim().min(1),
    answers_back: z.boolean().default(false)
});

/** The secret a channel authenticates with, which is the one field never served back. */
export const TelegramChannelViewSchema = TelegramChannelSchema.omit({ bot_token: true }).extend({
    bot_token_set: z.boolean()
});

/**
 * A channel as the operator hands it back. Leaving the secret out is how the page says "keep the
 * one you already have", which is the only thing it can say about a secret it was never shown.
 */
export const TelegramChannelUpdateSchema = TelegramChannelSchema.omit({ bot_token: true }).extend({
    bot_token: z.string().trim().min(1).optional()
});

export const NotificationChannelSchema = z.discriminatedUnion("kind", [TelegramChannelSchema]);
export const NotificationChannelViewSchema = z.discriminatedUnion("kind", [
    TelegramChannelViewSchema
]);
export const NotificationChannelUpdateSchema = z.discriminatedUnion("kind", [
    TelegramChannelUpdateSchema
]);

function channelDocument<Channel extends z.ZodType<{ kind: NotificationChannelKind }>>(
    channel: Channel
) {
    return z.object({
        /** What the channels below report, except where one of them says otherwise for itself. */
        defaults: NotificationDefaultsSchema.prefault({}),
        /**
         * Only the channels the operator has actually configured. A vendor the lab could talk to
         * and one it has been given credentials for are different things, and the difference is
         * whether it is listed here.
         */
        channels: z
            .array(channel)
            .default([])
            .refine(
                (channels) => distinct(channels.map(({ kind }) => kind)),
                NotificationSettingsRefusal.DUPLICATE_CHANNEL
            )
    });
}

/**
 * Who the lab tells about which of its moments. Parsing an empty document yields a lab that tells
 * nobody anything, which is what a lab that has never been configured does.
 */
export const NotificationSettingsSchema = channelDocument(NotificationChannelSchema);
export const NotificationSettingsViewSchema = channelDocument(NotificationChannelViewSchema);
export const NotificationSettingsUpdateSchema = channelDocument(NotificationChannelUpdateSchema);
