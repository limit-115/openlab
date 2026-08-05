import type { NotificationLanguage } from "@lab/protocol/operator-notifications/notification-channel.const";
import type { NotificationChannel as ConfiguredChannel } from "@lab/protocol/operator-notifications/notification-settings.types";
import type {
    NotificationSettingsReader,
    OpenNotificationChannel
} from "#src/operator-notifications/operator-notifications.types";

/**
 * One channel about to be written to, beside the language it reads in. The language is settled
 * before the message is written because it may be the lab's own rather than the channel's, and by
 * the time the message exists there is nothing left to ask.
 */
export interface ReportingChannel {
    readonly configured: ConfiguredChannel;
    readonly language: NotificationLanguage;
}

export interface NotificationDispatchOptions {
    readonly settings: NotificationSettingsReader;
    /**
     * The lab's own address, asked for as a message is written rather than held: the lab does not
     * know which port it is on until it is listening, and every message carries a link back into it.
     */
    readonly labUrl: () => string;
    readonly open?: OpenNotificationChannel;
    /**
     * Where a message that never arrived is reported. Nothing else happens about it: the lab has
     * research to get back to, and a vendor that is down is not a reason to stop doing it.
     */
    readonly onFailure?: (error: unknown) => void;
}
