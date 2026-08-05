import { describe, expect, it } from "vitest";
import { openSqliteDriver } from "#src/lab-database/sqlite-driver/sqlite-driver";

/**
 * What every SQLite the lab runs on has to agree about.
 *
 * The suite runs on whichever runtime invoked it, so the same cases prove `node:sqlite` when a
 * developer runs them and `bun:sqlite` when the released binary's runtime does. A driver that
 * disagreed here would not fail loudly: it would hand Drizzle rows shaped the other way and quietly
 * map every column onto the wrong field.
 */
describe("the SQLite driver this runtime carries", () => {
    function open() {
        const connection = openSqliteDriver(":memory:");
        connection.exec("create table finding (id text primary key, confidence real, note text)");
        return connection;
    }

    it("answers a read with the selected values in the order they were asked for", () => {
        const connection = open();
        connection.prepare("insert into finding values (?, ?, ?)").run("f-1", 0.94, "survived");

        expect(connection.prepare("select id, confidence, note from finding").all()).toEqual([
            ["f-1", 0.94, "survived"]
        ]);
        connection.close();
    });

    it("keeps a null apart from a missing value", () => {
        const connection = open();
        connection.prepare("insert into finding values (?, ?, ?)").run("f-1", 0.5, null);

        expect(connection.prepare("select note from finding").get()).toEqual([null]);
        connection.close();
    });

    it("answers a read that matched nothing with no row at all", () => {
        const connection = open();

        expect(
            connection.prepare("select id from finding where id = ?").get("absent")
        ).toBeUndefined();
        expect(connection.prepare("select id from finding").all()).toEqual([]);
        connection.close();
    });

    /** A statement is prepared once and answered many times, each time with its own values. */
    it("answers one prepared statement repeatedly", () => {
        const connection = open();
        const insert = connection.prepare("insert into finding values (?, ?, ?)");
        insert.run("f-1", 0.1, null);
        insert.run("f-2", 0.2, null);

        expect(connection.prepare("select id from finding order by id").all()).toEqual([
            ["f-1"],
            ["f-2"]
        ]);
        connection.close();
    });
});
