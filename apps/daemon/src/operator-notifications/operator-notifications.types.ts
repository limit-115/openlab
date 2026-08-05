import type { NotificationSettingsRepository } from "@nightlab/db/operator-notifications/notification-settings-repository";
import type { NotificationChannel } from "@nightlab/notifier/notification-channel.types";
import type { NotificationChannelKind } from "@nightlab/protocol/operator-notifications/notification-channel.const";
import type {
    NotificationChannel as ConfiguredChannel,
    NotificationSettings
} from "@nightlab/protocol/operator-notifications/notification-settings.types";

export type NotificationSettingsRecords = Pick<NotificationSettingsRepository, "read" | "write">;

/** Who the lab reports to right now, without a database round trip on the way to a message. */
export interface NotificationSettingsReader {
    read(): NotificationSettings;
}

/**
 * Turns a channel the operator configured into one that can carry a message. It is a seam rather
 * than a call so a test can watch what the lab decided to send without a vendor being reached.
 */
export type OpenNotificationChannel = (configured: ConfiguredChannel) => NotificationChannel;

/** What came of trying one channel, in the terms the settings page reports it in. */
export interface NotificationTestResult {
    readonly kind: NotificationChannelKind;
    readonly delivered: boolean;
    /** The vendor's own words when it refused. Absent when the message arrived. */
    readonly reason?: string;
}
