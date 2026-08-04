import { InvestigationRepository } from "@lab/db/investigations/investigation-repository";
import { createDatabase, type DatabaseClient } from "@lab/db/lab-database/lab-database-client";
import { migrateDatabase } from "@lab/db/lab-database/lab-schema-migration";
import { RuntimePersistence } from "@lab/db/runtime/runtime-persistence";
import type {
    InvestigationRecords,
    RegistryPersistence
} from "#src/investigation-registry/investigation-registry.types";

export interface DaemonDatabase {
    readonly persistence: RegistryPersistence;
    readonly investigations: InvestigationRecords;
    close(): Promise<void>;
}

export async function openDaemonDatabase(databaseUrl: string): Promise<DaemonDatabase> {
    const client = createDatabase(databaseUrl);

    try {
        await migrateDatabase(client.db);
        return createDaemonDatabase(client);
    } catch (error) {
        await client.close();
        throw error;
    }
}

function createDaemonDatabase(client: DatabaseClient): DaemonDatabase {
    return {
        persistence: new RuntimePersistence(client.db),
        investigations: new InvestigationRepository(client.db),
        close: () => client.close()
    };
}
