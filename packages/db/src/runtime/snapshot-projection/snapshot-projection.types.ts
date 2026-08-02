import type { Database } from "#src/lab-database/lab-database-client";

export type RuntimeProjectionDatabase = Pick<Database, "delete" | "insert" | "select">;
