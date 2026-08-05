import type {
    LabSqliteConnection,
    LabSqliteStatement,
    SqliteRow,
    SqliteValue
} from "#src/lab-database/sqlite-driver/sqlite-driver.types";

/**
 * The lab's connection through the SQLite that Node carries.
 *
 * `node:sqlite` is reached by dynamic import rather than a static one so that a Bun build, which
 * cannot resolve the module at all, still bundles this file without complaint. The import is only
 * ever reached on a Node runtime, where it resolves to a built-in already in memory.
 */
const { DatabaseSync } = await import("node:sqlite");

export function openNodeSqliteConnection(databasePath: string): LabSqliteConnection {
    const database = new DatabaseSync(databasePath);

    return {
        exec: (sql) => database.exec(sql),
        close: () => database.close(),
        prepare: (sql) => prepared(database.prepare(sql))
    };
}

/**
 * A row is asked for positionally, which every read here wants and the default keyed row is not.
 * The setting belongs to the statement, so it is stated on each one rather than once per connection.
 */
function prepared(
    statement: ReturnType<InstanceType<typeof DatabaseSync>["prepare"]>
): LabSqliteStatement {
    statement.setReturnArrays(true);

    return {
        run: (...values) => {
            statement.run(...(values as SqliteValue[]));
        },
        get: (...values) => statement.get(...(values as SqliteValue[])) as SqliteRow | undefined,
        all: (...values) => statement.all(...(values as SqliteValue[])) as unknown as SqliteRow[]
    };
}
