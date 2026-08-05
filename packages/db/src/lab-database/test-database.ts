import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDatabase, type DatabaseClient } from "#src/lab-database/lab-database-client";
import { migrateDatabase } from "#src/lab-database/lab-schema-migration";

const DIRECTORY_PREFIX = "lab-database-";
const FILE_NAME = "lab.db";

export interface TestDatabase extends DatabaseClient {
    readonly path: string;
}

/**
 * A migrated lab database of a test's own, on the same journal and pragmas a lab runs on. One file
 * per caller is what isolation costs here, so nothing is shared between suites and nothing has to
 * be cleaned up between cases. Closing it takes the file and its write-ahead log with it.
 */
export async function openTestDatabase(): Promise<TestDatabase> {
    const directory = await mkdtemp(path.join(tmpdir(), DIRECTORY_PREFIX));
    const databasePath = path.join(directory, FILE_NAME);
    const client = createDatabase(databasePath);
    const discard = async (): Promise<void> => {
        await client.close();
        await rm(directory, { recursive: true, force: true });
    };

    try {
        await migrateDatabase(client);
    } catch (error) {
        await discard();
        throw error;
    }

    return { ...client, path: databasePath, close: discard };
}
