/**
 * What the lab needs from a SQLite engine, and nothing more.
 *
 * A lab is written once and run on two runtimes: the sources a developer edits run on Node, and the
 * binary an operator installs is compiled with Bun. Each carries its own SQLite — `node:sqlite` and
 * `bun:sqlite` — and neither can see the other's. This contract is the seam between them, narrow
 * enough that both engines already satisfy it and the lab never asks which one answered.
 */

/** A value SQLite stores as it is, without the lab having to say which column type it became. */
export type SqliteValue = null | number | bigint | string | Uint8Array;

/** One row as Drizzle's proxy driver reads it: the selected values in the order they were asked for. */
export type SqliteRow = SqliteValue[];

/** A statement prepared once and answered as many times as it is given values. */
export interface LabSqliteStatement {
    /** Issues the statement for its effect. Nothing is read back. */
    run(...values: SqliteValue[]): void;
    /** The first matching row, or nothing at all when the read matched nothing. */
    get(...values: SqliteValue[]): SqliteRow | undefined;
    /** Every matching row, which is an empty list when the read matched nothing. */
    all(...values: SqliteValue[]): SqliteRow[];
}

/** The one connection a lab holds to its database file. */
export interface LabSqliteConnection {
    /** Issues SQL that takes no values: a pragma, a schema change, a transaction boundary. */
    exec(sql: string): void;
    prepare(sql: string): LabSqliteStatement;
    close(): void;
}

/** Opens a lab connection to a database file, creating the file when it is not there yet. */
export type OpenSqliteConnection = (databasePath: string) => LabSqliteConnection;
