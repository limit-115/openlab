import type { NotificationChannelKind } from "@nightlab/protocol/operator-notifications/notification-channel.const";
import { NotificationSettingsViewSchema } from "@nightlab/protocol/operator-notifications/notification-settings.schema";
import type { NotificationSettingsView } from "@nightlab/protocol/operator-notifications/notification-settings.types";
import { NotificationTestResultSchema } from "@nightlab/protocol/operator-notifications/notification-test.schema";
import type { NotificationTestResult } from "@nightlab/protocol/operator-notifications/notification-test.types";
import { NotificationEndpoint } from "#src/operator-notifications/operator-notifications.const";
import type { NotificationSettingsSubmission } from "#src/operator-notifications/operator-notifications.types";

export const notificationSettingsQueryKey = ["lab", "notifications"] as const;

export async function fetchNotificationSettings(
    signal?: AbortSignal
): Promise<NotificationSettingsView> {
    const response = await fetch(NotificationEndpoint.SETTINGS, {
        headers: { Accept: "application/json" },
        ...(signal ? { signal } : {})
    });
    if (!response.ok) {
        throw new Error(`Notification settings returned ${response.status}.`);
    }
    return NotificationSettingsViewSchema.parse(await response.json());
}

/**
 * Puts the whole document and takes back what the lab is reporting by from that moment. The answer
 * is the lab's own reading rather than what was sent, so what is on screen after a save is what
 * would actually be delivered, credentials and all.
 */
export async function saveNotificationSettings(
    settings: NotificationSettingsSubmission
): Promise<NotificationSettingsView> {
    const response = await fetch(NotificationEndpoint.SETTINGS, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(settings)
    });
    if (!response.ok) {
        throw new Error(`The lab refused the notification settings with ${response.status}.`);
    }
    return NotificationSettingsViewSchema.parse(await response.json());
}

/** Asks the lab to write to the operator through what it has stored, and to say how that went. */
export async function testNotificationChannel(
    kind: NotificationChannelKind
): Promise<NotificationTestResult> {
    const response = await fetch(NotificationEndpoint.TEST, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ kind })
    });
    if (!response.ok) {
        throw new Error(`The lab could not try the channel: ${response.status}.`);
    }
    return NotificationTestResultSchema.parse(await response.json());
}
