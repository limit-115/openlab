import type {
    LabSqliteConnection,
    OpenSqliteConnection
} from "#src/lab-database/sqlite-driver/sqlite-driver.types";

/**
 * Which SQLite the running runtime carries.
 *
 * The choice is made once, when this module is first loaded, so that opening a database stays the
 * synchronous call the rest of the lab makes it. Only the driver that was chosen is ever imported:
 * the other one names a module this runtime does not have, and importing it would throw.
 */
async function selectDriver(): Promise<OpenSqliteConnection> {
    if ("Bun" in globalThis) {
        const { openBunSqliteConnection } = await import(
            "#src/lab-database/sqlite-driver/bun-sqlite-driver"
        );
        return openBunSqliteConnection;
    }

    const { openNodeSqliteConnection } = await import(
        "#src/lab-database/sqlite-driver/node-sqlite-driver"
    );
    return openNodeSqliteConnection;
}

const openConnection = await selectDriver();

/** Opens a lab connection through the SQLite this runtime has, whichever one that turned out to be. */
export function openSqliteDriver(databasePath: string): LabSqliteConnection {
    return openConnection(databasePath);
}
