import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseClient } from "#src/client";
import { migrateDatabase } from "#src/migrations";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("migrateDatabase PostgreSQL 18 integration", () => {
    const clients: DatabaseClient[] = [];

    beforeAll(() => {
        if (databaseUrl === undefined) {
            return;
        }
        clients.push(createDatabase(databaseUrl, { max: 2 }));
        clients.push(createDatabase(databaseUrl, { max: 2 }));
    });

    afterAll(async () => {
        await Promise.all(clients.map((client) => client.close()));
    });

    it("serializes concurrent callers while official Drizzle migrations own journal semantics", async () => {
        const [first, second] = clients;
        if (first === undefined || second === undefined) {
            throw new Error("TEST_DATABASE_URL is required for this integration test");
        }

        await Promise.all([migrateDatabase(first.db), migrateDatabase(second.db)]);

        const [database] = await first.sql<
            [{ serverVersion: string; checkpointTable: string | null }]
        >`
            SELECT
                current_setting('server_version') AS "serverVersion",
                to_regclass('public.runtime_checkpoints')::text AS "checkpointTable"
        `;
        expect(database?.serverVersion.startsWith("18.")).toBe(true);
        expect(database?.checkpointTable).toBe("runtime_checkpoints");
    });
});
