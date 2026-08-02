import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Options, type Sql } from "postgres";
import * as schema from "#src/schema";

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseClient {
    readonly db: Database;
    readonly sql: Sql;
    close(): Promise<void>;
}

export interface DatabaseOptions extends Options<Record<string, never>> {
    readonly max?: number;
}

export function createDatabase(
    connectionString: string,
    options: DatabaseOptions = {}
): DatabaseClient {
    const client = postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
        ...options
    });

    return {
        db: drizzle(client, { schema }),
        sql: client,
        close: async () => client.end()
    };
}
