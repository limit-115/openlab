import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/sqlite-proxy/migrator";
import type { TransactionalDatabase } from "#src/lab-database/lab-database-client";

export function getDatabaseMigrationsPath(): string {
    return fileURLToPath(new URL("../../migrations", import.meta.url));
}

/**
 * Brings a database file up to the packaged schema. Drizzle owns the journal and hands back only
 * the statements this file is still missing, which are applied as one transaction so a database is
 * never left half migrated.
 */
export async function migrateDatabase(database: TransactionalDatabase): Promise<void> {
    await migrate(
        database.db,
        async (statements) => {
            if (statements.length === 0) {
                return;
            }
            await database.transaction(async (db) => {
                for (const statement of statements) {
                    await db.run(sql.raw(statement));
                }
            });
        },
        { migrationsFolder: getDatabaseMigrationsPath() }
    );
}
