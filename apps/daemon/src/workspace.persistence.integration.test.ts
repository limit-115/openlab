import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDatabase, type DatabaseClient } from "@lab/db/client";
import { migrateDatabase } from "@lab/db/migrations";
import { RuntimePersistence } from "@lab/db/runtime";
import { EventType } from "@lab/protocol/constants";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LabWorkspace } from "#src/workspace";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("LabWorkspace PostgreSQL 18 recovery", () => {
    let client: DatabaseClient;

    beforeAll(async () => {
        if (databaseUrl === undefined) {
            return;
        }
        client = createDatabase(databaseUrl, { max: 2 });
        await migrateDatabase(client.db);
    });

    afterAll(async () => {
        await client?.close();
    });

    it("repairs corrupt filesystem snapshots from the atomic database checkpoint", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-recovery-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Recover the authoritative state" }));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await LabWorkspace.initialize(workspaceRoot, taskPath, persistence);

        await workspace.appendEvent(EventType.LAB_STARTED, { source: "integration-test" });
        await workspace.update((draft) => {
            draft.frontier.known.push("PostgreSQL checkpoint survived");
        });
        await Promise.all([
            writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "events.json"), "corrupt")
        ]);

        const recovered = await LabWorkspace.openOrCreate(workspaceRoot, taskPath, persistence);

        expect(recovered.recovered).toBe(true);
        expect(recovered.labId).toBe(workspace.labId);
        expect(recovered.getSnapshot().frontier.known).toContain("PostgreSQL checkpoint survived");
        expect(recovered.getEvents().map(({ type }) => type)).toContain(EventType.LAB_STARTED);
        await expect(
            readFile(path.join(workspace.runDirectory, "status.json"), "utf8").then(JSON.parse)
        ).resolves.toMatchObject({ lab: { id: workspace.labId } });
    });
});
