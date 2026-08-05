import type { NotifiableEventType } from "#src/operator-notifications/notifiable-event.const";
import type { NotificationLanguage } from "#src/operator-notifications/notification-channel.const";
import type { NotificationDefaults } from "#src/operator-notifications/notification-settings.types";

/**
 * The two questions a channel may answer for itself. An unanswered one is absent rather than empty:
 * the lab has no way to tell "report nothing" from "report whatever you report", so it only ever
 * stores the one it was told.
 */
export interface ChannelReportOverride {
    readonly events?: readonly NotifiableEventType[] | undefined;
    readonly language?: NotificationLanguage | undefined;
}

/** What a channel reports once the questions it left alone are answered by the lab. */
export interface ChannelReport {
    readonly events: readonly NotifiableEventType[];
    readonly language: NotificationLanguage;
}

/**
 * What one channel reports and in which language. This is the only place the two are put together,
 * so a channel that answered neither question keeps following the lab's own answer wherever it is
 * read: what is dispatched, what the settings page shows, and what a test message is written in.
 */
export function channelReporting(
    channel: ChannelReportOverride,
    defaults: NotificationDefaults
): ChannelReport {
    return {
        events: channel.events ?? defaults.events,
        language: channel.language ?? defaults.language
    };
}
