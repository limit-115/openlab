import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "#src/lab-database/lab-schema";
import { openSqliteConnection } from "#src/lab-database/sqlite-connection";
import { SqliteStatementRunner } from "#src/lab-database/sqlite-statement-runner";

export type Database = SqliteRemoteDatabase<typeof schema>;

/**
 * A lab database and the only way to write several statements to it as one. Drizzle's own
 * `transaction()` issues its `BEGIN` down the same single connection every other caller writes
 * through, so a transaction is opened here instead, where the connection can be held for it.
 */
export interface TransactionalDatabase {
    readonly db: Database;
    transaction<Result>(run: (db: Database) => Promise<Result>): Promise<Result>;
}

export interface DatabaseClient extends TransactionalDatabase {
    close(): Promise<void>;
}

/** Opens the lab database, creating the file if this is the first time it has been asked for. */
export function createDatabase(databasePath: string): DatabaseClient {
    const connection = openSqliteConnection(databasePath);
    const runner = new SqliteStatementRunner(connection);
    const db = drizzle(runner.execute, { schema });

    return {
        db,
        transaction: (run) => runner.transaction(() => run(db)),
        close: () => runner.close()
    };
}
