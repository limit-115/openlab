import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDatabase, type DatabaseClient } from "@lab/db/client";
import { migrateDatabase } from "@lab/db/migrations";
import { RuntimePersistence } from "@lab/db/runtime";
import { labs } from "@lab/db/schema";
import { CapabilityStatus, EventType } from "@lab/protocol/constants";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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

    afterEach(async () => {
        await client?.db.delete(labs);
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

        const request = await recovered.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace"
        });
        await recovered.provideCapability(request.id, "dataset://independent/v1");
        await writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt");

        const recoveredCapabilityWorkspace = await LabWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            persistence
        );
        const capability = recoveredCapabilityWorkspace
            .getSnapshot()
            .capability_requests.find(({ id }) => id === request.id);
        expect(capability).toMatchObject({
            status: CapabilityStatus.PROVIDED,
            resource_reference: "dataset://independent/v1"
        });
        expect(capability?.provided_at).toBeDefined();
        expect(recoveredCapabilityWorkspace.getSnapshot().frontier.blockers).not.toContain(
            request.need
        );
        expect(
            await client.db.query.capabilityRequests.findFirst({
                where: (capability, { eq }) => eq(capability.id, request.id)
            })
        ).toMatchObject({
            status: CapabilityStatus.PROVIDED,
            resourceReference: "dataset://independent/v1",
            providedAt: new Date(capability?.provided_at ?? "")
        });
    });

    it("recovers the latest matching runtime and repairs a missing current pointer", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-missing-pointer-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        const task = {
            id: `task-missing-pointer-${randomUUID()}`,
            goal: "Recover without a filesystem pointer",
            context: ["The database remains available"],
            success_criteria: ["The same lab resumes"]
        };
        await writeFile(taskPath, JSON.stringify(task));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await LabWorkspace.initialize(workspaceRoot, taskPath, persistence);
        await workspace.update((draft) => {
            draft.frontier.known.push("Latest database state");
        });
        await Promise.all([
            unlink(path.join(workspaceRoot, "current.json")),
            writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "events.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "task.json"), "corrupt")
        ]);

        const recovered = await LabWorkspace.openOrCreate(workspaceRoot, taskPath, persistence);

        expect(recovered.recovered).toBe(true);
        expect(recovered.labId).toBe(workspace.labId);
        expect(recovered.getSnapshot().frontier.known).toContain("Latest database state");
        await expect(recovered.getTask()).resolves.toEqual(task);
        await expect(readCurrentPointer(workspaceRoot)).resolves.toEqual({
            lab_id: workspace.labId,
            run_directory: workspace.runDirectory
        });
    });

    it("recovers the matching runtime and replaces a corrupt current pointer", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-corrupt-pointer-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        const task = {
            id: `task-corrupt-pointer-${randomUUID()}`,
            goal: "Recover despite a corrupt filesystem pointer",
            context: [],
            success_criteria: ["The pointer is repaired from PostgreSQL"]
        };
        await writeFile(taskPath, JSON.stringify(task));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await LabWorkspace.initialize(workspaceRoot, taskPath, persistence);
        await workspace.appendEvent(EventType.FRONTIER_UPDATED, {
            source: "corrupt-pointer-test"
        });
        await Promise.all([
            writeFile(path.join(workspaceRoot, "current.json"), "{not-json"),
            writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "events.json"), "corrupt")
        ]);

        const recovered = await LabWorkspace.openOrCreate(workspaceRoot, taskPath, persistence);

        expect(recovered.recovered).toBe(true);
        expect(recovered.labId).toBe(workspace.labId);
        expect(recovered.getEvents().map(({ type }) => type)).toContain(EventType.FRONTIER_UPDATED);
        await expect(readCurrentPointer(workspaceRoot)).resolves.toEqual({
            lab_id: workspace.labId,
            run_directory: workspace.runDirectory
        });
    });
});

async function readCurrentPointer(workspaceRoot: string): Promise<unknown> {
    return JSON.parse(await readFile(path.join(workspaceRoot, "current.json"), "utf8"));
}
