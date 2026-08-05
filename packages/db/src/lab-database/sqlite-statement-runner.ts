import { AsyncLocalStorage } from "node:async_hooks";
import type { RemoteCallback } from "drizzle-orm/sqlite-proxy";
import type {
    LabSqliteConnection,
    SqliteRow,
    SqliteValue
} from "#src/lab-database/sqlite-driver/sqlite-driver.types";
import {
    SqliteStatementMethod,
    SqliteTransactionStatement
} from "#src/lab-database/sqlite-statement-runner.const";

/**
 * One connection answering one statement at a time.
 *
 * A lab's SQLite is synchronous and a lab holds a single connection, so a transaction that awaited
 * between its own statements would have another caller's write land inside it and disappear with
 * its rollback. Every statement therefore queues behind whatever is already running, and a
 * transaction holds that place from `BEGIN` to `COMMIT`. The statements it issues in between skip
 * the queue rather than deadlock behind it, recognised by the async context they were started in.
 */
export class SqliteStatementRunner {
    readonly #connection: LabSqliteConnection;
    readonly #openTransaction = new AsyncLocalStorage<true>();
    #queued: Promise<unknown> = Promise.resolve();

    constructor(connection: LabSqliteConnection) {
        this.#connection = connection;
    }

    /** The callback Drizzle's SQLite proxy driver issues every statement through. */
    readonly execute: RemoteCallback = (sql, params, method) => {
        const statement = () => this.#answer(sql, params, method);
        return this.#insideTransaction() ? statement() : this.#queue(statement);
    };

    /**
     * Runs everything the callback issues as one transaction. Nesting is refused rather than
     * silently joined: SQLite has no nested transactions, and waiting for the queue the caller is
     * already holding would hang instead of failing.
     */
    async transaction<Result>(run: () => Promise<Result>): Promise<Result> {
        if (this.#insideTransaction()) {
            throw new Error("A lab database transaction cannot be opened inside another one");
        }
        return this.#queue(() => this.#openTransaction.run(true, () => this.#commit(run)));
    }

    async #commit<Result>(run: () => Promise<Result>): Promise<Result> {
        this.#connection.exec(SqliteTransactionStatement.BEGIN);
        try {
            const result = await run();
            this.#connection.exec(SqliteTransactionStatement.COMMIT);
            return result;
        } catch (error) {
            this.#connection.exec(SqliteTransactionStatement.ROLLBACK);
            throw error;
        }
    }

    /**
     * Closes the connection once it has finished answering, rather than out from under a write in
     * flight: SQLite rolls an open transaction back when its connection goes, so a lab interrupted
     * mid-commit would lose the cycle it had just finished.
     */
    async close(): Promise<void> {
        await this.#queue(async () => {
            this.#connection.close();
        });
    }

    #insideTransaction(): boolean {
        return this.#openTransaction.getStore() !== undefined;
    }

    /** Takes the next place in the queue, whether the work ahead of it succeeded or failed. */
    #queue<Result>(work: () => Promise<Result>): Promise<Result> {
        const result = this.#queued.then(work, work);
        this.#queued = result.then(
            () => undefined,
            () => undefined
        );
        return result;
    }

    async #answer(
        sql: string,
        params: readonly unknown[],
        method: SqliteStatementMethod
    ): Promise<{ rows: SqliteRow | SqliteRow[] }> {
        const statement = this.#connection.prepare(sql);
        const values = params as SqliteValue[];
        if (method === SqliteStatementMethod.RUN) {
            statement.run(...values);
            return { rows: [] };
        }
        if (method === SqliteStatementMethod.GET) {
            return { rows: readRow(statement.get(...values)) };
        }
        return { rows: statement.all(...values) };
    }
}

/** A read that matched nothing hands back no row at all, which is how Drizzle reads it too. */
function readRow(row: SqliteRow | undefined): SqliteRow {
    return row as SqliteRow;
}
