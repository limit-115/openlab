import { DatabaseSync } from "node:sqlite";
import { SqlitePragma } from "#src/lab-database/sqlite-connection.const";

/**
 * The one connection a lab holds to its database file. Opening it is also where it is configured:
 * a pragma lives on the connection rather than in the file, so a connection that skipped this is a
 * database with no cascades and no crash safety.
 */
export function openSqliteConnection(databasePath: string): DatabaseSync {
    const connection = new DatabaseSync(databasePath);
    for (const pragma of Object.values(SqlitePragma)) {
        connection.exec(pragma);
    }
    return connection;
}
