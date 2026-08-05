import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSqliteConnection } from "#src/lab-database/sqlite-connection";
import { SqliteStatementRunner } from "#src/lab-database/sqlite-statement-runner";
import { SqliteStatementMethod } from "#src/lab-database/sqlite-statement-runner.const";

const INSERT = "insert into written (value) values (?)";
const SELECT = "select value from written order by id";

describe("SqliteStatementRunner", () => {
    let connection: DatabaseSync;
    let runner: SqliteStatementRunner;

    beforeEach(() => {
        connection = openSqliteConnection(":memory:");
        connection.exec("create table written (id integer primary key autoincrement, value text)");
        runner = new SqliteStatementRunner(connection);
    });

    afterEach(() => {
        connection.close();
    });

    function written(): string[] {
        return connection
            .prepare(SELECT)
            .all()
            .map((row) => String(row.value));
    }

    it("keeps a statement issued while a transaction is open out of what that transaction rolls back", async () => {
        const opened = Promise.withResolvers<void>();
        const issued = Promise.withResolvers<void>();

        const abandoned = runner.transaction(async () => {
            await runner.execute(INSERT, ["inside"], SqliteStatementMethod.RUN);
            opened.resolve();
            await issued.promise;
            throw new Error("The transaction gave up");
        });
        await opened.promise;
        const beside = runner.execute(INSERT, ["outside"], SqliteStatementMethod.RUN);
        issued.resolve();

        await expect(abandoned).rejects.toThrow("The transaction gave up");
        await beside;

        expect(written()).toEqual(["outside"]);
    });

    it("runs concurrent transactions one after another rather than inside each other", async () => {
        await Promise.all([
            runner.transaction(async () => {
                await runner.execute(INSERT, ["first"], SqliteStatementMethod.RUN);
            }),
            runner.transaction(async () => {
                await runner.execute(INSERT, ["second"], SqliteStatementMethod.RUN);
            })
        ]);

        expect(written()).toEqual(["first", "second"]);
    });

    it("goes on answering after a transaction has failed", async () => {
        await expect(
            runner.transaction(() => Promise.reject(new Error("The transaction gave up")))
        ).rejects.toThrow("The transaction gave up");

        await runner.execute(INSERT, ["after"], SqliteStatementMethod.RUN);

        expect(written()).toEqual(["after"]);
    });

    it("refuses a transaction opened inside another one instead of waiting for itself", async () => {
        await expect(
            runner.transaction(() => runner.transaction(async () => undefined))
        ).rejects.toThrow("cannot be opened inside another one");
    });

    /** Drizzle reads a row by position, so a keyed row would map every column onto the wrong field. */
    it("answers with the selected values in the order they were asked for", async () => {
        await runner.execute(INSERT, ["read back"], SqliteStatementMethod.RUN);

        expect(await runner.execute(SELECT, [], SqliteStatementMethod.ALL)).toEqual({
            rows: [["read back"]]
        });
        expect(await runner.execute(SELECT, [], SqliteStatementMethod.GET)).toEqual({
            rows: ["read back"]
        });
    });

    it("answers a read that matched nothing with no row at all", async () => {
        expect(await runner.execute(SELECT, [], SqliteStatementMethod.GET)).toEqual({
            rows: undefined
        });
    });
});
