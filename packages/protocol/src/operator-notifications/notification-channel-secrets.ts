import { NotificationChannelKind } from "#src/operator-notifications/notification-channel.const";
import type {
    NotificationChannel,
    NotificationChannelUpdate,
    NotificationChannelView,
    NotificationSettings,
    NotificationSettingsUpdate,
    NotificationSettingsView
} from "#src/operator-notifications/notification-settings.types";

/**
 * A channel as everything outside the lab may see it. The credential a channel authenticates with
 * is written once and never read back: the operator typed it, so serving it again tells them
 * nothing they do not already know, and every copy of it is somewhere else it can leak from.
 */
export function withoutChannelSecret(channel: NotificationChannel): NotificationChannelView {
    switch (channel.kind) {
        case NotificationChannelKind.TELEGRAM: {
            const { bot_token, ...served } = channel;
            return { ...served, bot_token_set: bot_token.length > 0 };
        }
    }
}

export function withoutChannelSecrets(settings: NotificationSettings): NotificationSettingsView {
    return {
        defaults: settings.defaults,
        channels: settings.channels.map(withoutChannelSecret)
    };
}

/**
 * What the operator handed back, with the secrets they were never shown put back in. A channel that
 * names no secret keeps the stored one; a channel the lab has never held has no secret to keep, so
 * one that names none is dropped rather than stored half-configured and silently unable to send.
 */
export function withKeptChannelSecrets(
    update: NotificationSettingsUpdate,
    stored: NotificationSettings
): NotificationSettings {
    return {
        defaults: update.defaults,
        channels: update.channels.flatMap((channel) => {
            const held = stored.channels.find(({ kind }) => kind === channel.kind);
            const kept = keptChannel(channel, held);
            return kept === undefined ? [] : [kept];
        })
    };
}

function keptChannel(
    channel: NotificationChannelUpdate,
    held: NotificationChannel | undefined
): NotificationChannel | undefined {
    switch (channel.kind) {
        case NotificationChannelKind.TELEGRAM: {
            const bot_token =
                channel.bot_token ??
                (held?.kind === NotificationChannelKind.TELEGRAM ? held.bot_token : undefined);
            return bot_token === undefined ? undefined : { ...channel, bot_token };
        }
    }
}
