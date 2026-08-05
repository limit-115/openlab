/**
 * How a transaction is opened, closed and abandoned. The lab only ever writes inside one, so the
 * write lock is taken up front rather than upgraded to halfway through and refused.
 */
export const SqliteTransactionStatement = {
    BEGIN: "BEGIN IMMEDIATE",
    COMMIT: "COMMIT",
    ROLLBACK: "ROLLBACK"
} as const;

/** What Drizzle asks a statement to return. */
export const SqliteStatementMethod = {
    RUN: "run",
    ALL: "all",
    GET: "get",
    VALUES: "values"
} as const;
export type SqliteStatementMethod =
    (typeof SqliteStatementMethod)[keyof typeof SqliteStatementMethod];
