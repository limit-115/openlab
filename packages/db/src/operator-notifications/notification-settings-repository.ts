import type { NotificationSettings } from "@nightlab/protocol/operator-notifications/notification-settings.types";
import { eq } from "drizzle-orm";
import type { Database } from "#src/lab-database/lab-database-client";
import { notificationSettings } from "#src/lab-database/lab-schema";
import { NOTIFICATION_SETTINGS_ROW_ID } from "#src/operator-notifications/notification-settings.const";

/**
 * Where the lab keeps who it reports to. The document is read and written whole for the same reason
 * the lab's own settings are: a channel's credential, its chat and the moments it reports mean
 * nothing apart from each other, and a partial write would leave a channel that cannot send.
 */
export class NotificationSettingsRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    /** Who the operator configured, or nothing at all for a lab that tells nobody anything. */
    async read(): Promise<NotificationSettings | undefined> {
        const row = await this.#database.query.notificationSettings.findFirst({
            where: eq(notificationSettings.id, NOTIFICATION_SETTINGS_ROW_ID)
        });
        return row?.settings;
    }

    async write(settings: NotificationSettings): Promise<NotificationSettings> {
        const now = new Date();
        const [row] = await this.#database
            .insert(notificationSettings)
            .values({
                id: NOTIFICATION_SETTINGS_ROW_ID,
                settings,
                createdAt: now,
                updatedAt: now
            })
            .onConflictDoUpdate({
                target: notificationSettings.id,
                set: { settings, updatedAt: now }
            })
            .returning();
        if (row === undefined) {
            throw new Error("Failed to write the notification settings");
        }
        return row.settings;
    }
}
