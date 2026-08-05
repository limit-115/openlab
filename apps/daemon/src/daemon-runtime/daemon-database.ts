import { InvestigationRepository } from "@nightlab/db/investigations/investigation-repository";
import { createDatabase, type DatabaseClient } from "@nightlab/db/lab-database/lab-database-client";
import { migrateDatabase } from "@nightlab/db/lab-database/lab-schema-migration";
import { LabSettingsRepository } from "@nightlab/db/lab-settings/lab-settings-repository";
import { NotificationSettingsRepository } from "@nightlab/db/operator-notifications/notification-settings-repository";
import { RuntimePersistence } from "@nightlab/db/runtime/runtime-persistence";
import type {
    InvestigationRecords,
    RegistryPersistence
} from "#src/investigation-registry/investigation-registry.types";
import type { LabSettingsRecords } from "#src/lab-settings/lab-settings.types";
import type { NotificationSettingsRecords } from "#src/operator-notifications/operator-notifications.types";

export interface DaemonDatabase {
    readonly persistence: RegistryPersistence;
    readonly investigations: InvestigationRecords;
    readonly settings: LabSettingsRecords;
    readonly notifications: NotificationSettingsRecords;
    close(): Promise<void>;
}

export async function openDaemonDatabase(databasePath: string): Promise<DaemonDatabase> {
    const client = createDatabase(databasePath);

    try {
        await migrateDatabase(client);
        return createDaemonDatabase(client);
    } catch (error) {
        await client.close();
        throw error;
    }
}

function createDaemonDatabase(client: DatabaseClient): DaemonDatabase {
    return {
        persistence: new RuntimePersistence(client),
        investigations: new InvestigationRepository(client.db),
        settings: new LabSettingsRepository(client.db),
        notifications: new NotificationSettingsRepository(client.db),
        close: () => client.close()
    };
}
