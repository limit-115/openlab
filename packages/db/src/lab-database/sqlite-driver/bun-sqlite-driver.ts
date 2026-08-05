/// <reference path="./bun-sqlite.d.ts" />
import type {
    LabSqliteConnection,
    LabSqliteStatement
} from "#src/lab-database/sqlite-driver/sqlite-driver.types";

/**
 * The lab's connection through the SQLite that Bun carries.
 *
 * Bun answers a positional read with `values()` where Node answers with a statement told to return
 * arrays. That is the whole of the difference, and it stops here: above this file a row is a row.
 */
const { Database } = await import("bun:sqlite");

export function openBunSqliteConnection(databasePath: string): LabSqliteConnection {
    const database = new Database(databasePath);

    return {
        exec: (sql) => {
            database.exec(sql);
        },
        close: () => {
            database.close();
        },
        prepare: (sql) => prepared(database.prepare(sql))
    };
}

function prepared(
    statement: ReturnType<InstanceType<typeof Database>["prepare"]>
): LabSqliteStatement {
    return {
        run: (...values) => {
            statement.run(...values);
        },
        get: (...values) => statement.values(...values)[0],
        all: (...values) => statement.values(...values)
    };
}
