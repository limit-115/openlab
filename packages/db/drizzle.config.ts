import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/lab-database/lab-schema.ts",
    out: "./migrations",
    ...(databaseUrl === undefined ? {} : { dbCredentials: { url: databaseUrl } })
});
