import { fileURLToPath } from "node:url";
import { shippedDirectory } from "@nightlab/core/lab-installation/shipped-directory";
import { ShippedDirectory } from "@nightlab/core/lab-installation/shipped-directory.const";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/sqlite-proxy/migrator";
import type { TransactionalDatabase } from "#src/lab-database/lab-database-client";

/**
 * The migrations this lab was released with, which a released lab keeps beside its executable and
 * a lab run from its sources keeps in the package that generated them.
 */
export function getDatabaseMigrationsPath(): string {
    return (
        shippedDirectory(ShippedDirectory.MIGRATIONS) ??
        fileURLToPath(new URL("../../migrations", import.meta.url))
    );
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
