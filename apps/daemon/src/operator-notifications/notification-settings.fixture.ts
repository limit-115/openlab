import type { NotificationSettings } from "@lab/protocol/operator-notifications/notification-settings.types";
import type { NotificationSettingsRecords } from "#src/operator-notifications/operator-notifications.types";

/** The notification row as far as the store is concerned: one document, written whole or absent. */
export class InMemoryNotificationSettings implements NotificationSettingsRecords {
    #settings: NotificationSettings | undefined;

    constructor(settings?: NotificationSettings) {
        this.#settings = settings;
    }

    async read(): Promise<NotificationSettings | undefined> {
        return this.#settings === undefined ? undefined : structuredClone(this.#settings);
    }

    async write(settings: NotificationSettings): Promise<NotificationSettings> {
        this.#settings = structuredClone(settings);
        return structuredClone(settings);
    }
}
