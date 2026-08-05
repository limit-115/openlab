import { defineConfig } from "drizzle-kit";

/**
 * Only the baseline is generated here. The lab applies its own migrations when it opens the
 * database file, so drizzle-kit is never pointed at a live lab.
 */
export default defineConfig({
    dialect: "sqlite",
    schema: "./src/lab-database/lab-schema.ts",
    out: "./migrations"
});
