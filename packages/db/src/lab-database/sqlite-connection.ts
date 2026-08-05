import { SqlitePragma } from "#src/lab-database/sqlite-connection.const";
import { openSqliteDriver } from "#src/lab-database/sqlite-driver/sqlite-driver";
import type { LabSqliteConnection } from "#src/lab-database/sqlite-driver/sqlite-driver.types";

/**
 * The one connection a lab holds to its database file. Opening it is also where it is configured:
 * a pragma lives on the connection rather than in the file, so a connection that skipped this is a
 * database with no cascades and no crash safety.
 */
export function openSqliteConnection(databasePath: string): LabSqliteConnection {
    const connection = openSqliteDriver(databasePath);
    for (const pragma of Object.values(SqlitePragma)) {
        connection.exec(pragma);
    }
    return connection;
}
