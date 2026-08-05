import { access } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { investigations } from "#src/lab-database/lab-schema";
import { getDatabaseMigrationsPath, migrateDatabase } from "#src/lab-database/lab-schema-migration";
import { openTestDatabase } from "#src/lab-database/test-database";
import { makeInput } from "#src/runtime/runtime-snapshot.fixture";

describe("getDatabaseMigrationsPath", () => {
    it("resolves the packaged Drizzle journal independently of the caller working directory", async () => {
        const migrationsPath = getDatabaseMigrationsPath();

        await expect(access(path.join(migrationsPath, "meta", "_journal.json"))).resolves.toBe(
            undefined
        );
        expect(path.isAbsolute(migrationsPath)).toBe(true);
    });
});

describe("migrateDatabase", () => {
    /**
     * The lab migrates every time it opens its database, so the second time has to leave it as a
     * lab that still holds its work rather than one that was rebuilt around it.
     */
    it("leaves a database it has already migrated, and everything in it, alone", async () => {
        const database = await openTestDatabase();
        try {
            const input = makeInput();
            await database.db.insert(investigations).values({
                id: "investigation-already-migrated",
                goal: input.goal,
                input,
                workspacePath: "/tmp/lab-already-migrated"
            });

            await migrateDatabase(database);

            expect(
                await database.db.query.investigations.findFirst({
                    where: eq(investigations.id, "investigation-already-migrated")
                })
            ).toEqual(expect.objectContaining({ goal: input.goal, input }));
        } finally {
            await database.close();
        }
    });
});
