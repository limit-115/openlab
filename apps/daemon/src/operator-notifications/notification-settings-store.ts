import { withKeptChannelSecrets } from "@openlab/protocol/operator-notifications/notification-channel-secrets";
import { NotificationSettingsSchema } from "@openlab/protocol/operator-notifications/notification-settings.schema";
import type {
    NotificationSettings,
    NotificationSettingsUpdate
} from "@openlab/protocol/operator-notifications/notification-settings.types";
import type {
    NotificationSettingsReader,
    NotificationSettingsRecords
} from "#src/operator-notifications/operator-notifications.types";

const SILENT_LAB = NotificationSettingsSchema.parse({});

/** A lab that reports to nobody, for a dispatch that was handed no settings of its own. */
export const SILENT_NOTIFICATION_SETTINGS: NotificationSettingsReader = {
    read: () => SILENT_LAB
};

/**
 * Who the lab reports to right now. Every message the lab decides to send asks this rather than the
 * database, so a channel the operator switches off goes quiet for the very next event without
 * anything being restarted.
 */
export class NotificationSettingsStore implements NotificationSettingsReader {
    readonly #records: NotificationSettingsRecords;
    #settings: NotificationSettings = SILENT_LAB;

    constructor(records: NotificationSettingsRecords) {
        this.#records = records;
    }

    /**
     * Takes up what the operator configured, once, as the lab opens. A stored document this version
     * can no longer read leaves the lab silent rather than guessing at a recipient: the settings
     * page then shows nothing configured, which is the operator's cue to configure it again.
     */
    async load(): Promise<NotificationSettings> {
        const stored = await this.#records.read();
        if (stored === undefined) {
            return this.#settings;
        }
        const parsed = NotificationSettingsSchema.safeParse(stored);
        if (parsed.success) {
            this.#settings = parsed.data;
        }
        return this.#settings;
    }

    read(): NotificationSettings {
        return this.#settings;
    }

    /**
     * Takes what the operator handed back, putting the credentials they were never shown back where
     * they belong. Anything the update leaves out is left out for good, so removing a channel here
     * is what forgets its credential.
     */
    async write(update: NotificationSettingsUpdate): Promise<NotificationSettings> {
        this.#settings = await this.#records.write(withKeptChannelSecrets(update, this.#settings));
        return this.#settings;
    }
}
