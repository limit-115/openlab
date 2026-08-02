import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Database } from "#src/client";

const DatabaseMigrationLock = {
    RUNTIME_SCHEMA: 1_856_667_217
} as const;

export function getDatabaseMigrationsPath(): string {
    return fileURLToPath(new URL("../migrations", import.meta.url));
}

export async function migrateDatabase(database: Database): Promise<void> {
    if (database.$client.options.max < 2) {
        throw new RangeError("Database migration requires a connection pool with max >= 2");
    }
    const lockConnection = await database.$client.reserve();
    try {
        await lockConnection`SELECT pg_advisory_lock(${DatabaseMigrationLock.RUNTIME_SCHEMA})`;
        await migrate(database, { migrationsFolder: getDatabaseMigrationsPath() });
    } finally {
        try {
            await lockConnection`SELECT pg_advisory_unlock(${DatabaseMigrationLock.RUNTIME_SCHEMA})`;
        } finally {
            lockConnection.release();
        }
    }
}
