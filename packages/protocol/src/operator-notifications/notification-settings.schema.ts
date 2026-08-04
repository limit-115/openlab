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

/**
 * What every channel is set with, whichever vendor carries the message. A channel decides for
 * itself which moments it reports and which language it reports them in, because two recipients of
 * the same lab are not the same person: one may want only the breakthroughs, in Russian.
 */
const NOTIFICATION_CHANNEL_FIELDS = {
    /** Configured and silent is a real answer, so a channel is switched rather than deleted. */
    enabled: z.boolean().default(false),
    events: z
        .array(z.enum(NOTIFIABLE_EVENT_TYPES))
        .nonempty(NotificationSettingsRefusal.NO_EVENTS)
        .refine(distinct, NotificationSettingsRefusal.DUPLICATE_EVENT)
        .default([...DEFAULT_NOTIFIED_EVENTS]),
    language: z.enum(NotificationLanguage).default(DEFAULT_NOTIFICATION_LANGUAGE)
};

/**
 * One Telegram bot writing to one chat. The token authenticates as the bot itself rather than for
 * one message, so it is the channel's secret and never leaves the lab once it is stored.
 */
export const TelegramChannelSchema = z.object({
    kind: z.literal(NotificationChannelKind.TELEGRAM),
    ...NOTIFICATION_CHANNEL_FIELDS,
    bot_token: z.string().trim().min(1),
    chat_id: z.string().trim().min(1)
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
