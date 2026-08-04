import { createDatabase, type DatabaseClient } from "@lab/db/lab-database/lab-database-client";
import { migrateDatabase } from "@lab/db/lab-database/lab-schema-migration";
import { RuntimePersistence } from "@lab/db/runtime/runtime-persistence";
import type { WorkspaceRuntimePersistence } from "#src/investigation-workspace/investigation-workspace.types";

export interface DaemonDatabase {
    readonly persistence: WorkspaceRuntimePersistence;
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
        close: () => client.close()
    };
}
