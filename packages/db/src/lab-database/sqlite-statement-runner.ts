import { AsyncLocalStorage } from "node:async_hooks";
import type { DatabaseSync, SQLInputValue, SQLOutputValue, StatementSync } from "node:sqlite";
import type { RemoteCallback } from "drizzle-orm/sqlite-proxy";
import {
    SqliteStatementMethod,
    SqliteTransactionStatement
} from "#src/lab-database/sqlite-statement-runner.const";

/** One row as Drizzle reads it: the selected values in the order they were asked for. */
type StatementRow = SQLOutputValue[];

/**
 * One connection answering one statement at a time.
 *
 * node:sqlite is synchronous and a lab holds a single connection, so a transaction that awaited
 * between its own statements would have another caller's write land inside it and disappear with
 * its rollback. Every statement therefore queues behind whatever is already running, and a
 * transaction holds that place from `BEGIN` to `COMMIT`. The statements it issues in between skip
 * the queue rather than deadlock behind it, recognised by the async context they were started in.
 */
export class SqliteStatementRunner {
    readonly #connection: DatabaseSync;
    readonly #openTransaction = new AsyncLocalStorage<true>();
    #queued: Promise<unknown> = Promise.resolve();

    constructor(connection: DatabaseSync) {
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
        method: string
    ): Promise<{ rows: StatementRow | StatementRow[] }> {
        const statement = this.#connection.prepare(sql);
        const values = params as SQLInputValue[];
        if (method === SqliteStatementMethod.RUN) {
            statement.run(...values);
            return { rows: [] };
        }
        statement.setReturnArrays(true);
        if (method === SqliteStatementMethod.GET) {
            return { rows: readRow(statement.get(...values)) };
        }
        return { rows: readRows(statement.all(...values)) };
    }
}

/**
 * `setReturnArrays` is what Drizzle's proxy contract asks for and what the statement was told to
 * do, but the node:sqlite typings only describe the keyed row it returns by default.
 */
function readRows(rows: ReturnType<StatementSync["all"]>): StatementRow[] {
    return rows as unknown as StatementRow[];
}

/** A read that matched nothing hands back no row at all, which is how Drizzle reads it too. */
function readRow(row: ReturnType<StatementSync["get"]>): StatementRow {
    return row as unknown as StatementRow;
}
