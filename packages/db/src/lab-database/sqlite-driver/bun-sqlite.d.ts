/**
 * The part of Bun's SQLite the lab speaks to.
 *
 * `bun:sqlite` exists only inside a Bun runtime, so nothing on disk describes it to TypeScript the
 * way `@types/node` describes `node:sqlite`. Declaring the surface the lab actually uses keeps the
 * driver beside this file type-checked without taking on a dependency that redeclares every global.
 */
declare module "bun:sqlite" {
    type BunSqliteValue = null | number | bigint | string | Uint8Array;

    /** Bun answers a write with what it changed, which the lab prepares for but does not read. */
    interface BunSqliteChanges {
        changes: number;
        lastInsertRowid: number | bigint;
    }

    class Statement {
        run(...values: BunSqliteValue[]): BunSqliteChanges;
        /** Rows as positional arrays, which is what Drizzle's proxy driver asks the lab for. */
        values(...values: BunSqliteValue[]): BunSqliteValue[][];
    }

    export class Database {
        constructor(databasePath: string);
        exec(sql: string): void;
        prepare(sql: string): Statement;
        close(): void;
    }
}
