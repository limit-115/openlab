import type { NotificationChannel } from "@openlab/notifier/notification-channel.types";
import { TelegramBotChannel } from "@openlab/notifier/telegram-bot-channel";
import { NotificationChannelKind } from "@openlab/protocol/operator-notifications/notification-channel.const";
import type { NotificationChannel as ConfiguredChannel } from "@openlab/protocol/operator-notifications/notification-settings.types";

/**
 * A channel the operator configured, opened as one that can carry a message. This is the whole of
 * what the lab has to learn to gain a vendor: a case here, beside the settings that describe it and
 * the module in the notifier that talks to it.
 */
export function openNotificationChannel(configured: ConfiguredChannel): NotificationChannel {
    switch (configured.kind) {
        case NotificationChannelKind.TELEGRAM:
            return new TelegramBotChannel({
                botToken: configured.bot_token,
                chatId: configured.chat_id,
                answersBack: configured.answers_back
            });
    }
}
