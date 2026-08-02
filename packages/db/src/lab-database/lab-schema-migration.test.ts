import { access } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDatabaseMigrationsPath } from "#src/lab-database/lab-schema-migration";

describe("getDatabaseMigrationsPath", () => {
    it("resolves the packaged Drizzle journal independently of the caller working directory", async () => {
        const migrationsPath = getDatabaseMigrationsPath();

        await expect(access(path.join(migrationsPath, "meta", "_journal.json"))).resolves.toBe(
            undefined
        );
        expect(path.isAbsolute(migrationsPath)).toBe(true);
    });
});
