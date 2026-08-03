import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDatabase, type DatabaseClient } from "@lab/db/lab-database/lab-database-client";
import { agentRuns, assumptions, events, findings, labs } from "@lab/db/lab-database/lab-schema";
import { migrateDatabase } from "@lab/db/lab-database/lab-schema-migration";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { writeCurrentPointer } from "#src/lab-workspace/lab-run-pointer";
import { WorkspaceLayout } from "#src/lab-workspace/lab-workspace.const";
import { planPurge, purgeRuns } from "#src/run-purge/run-purge";
import { PurgeScope } from "#src/run-purge/run-purge.const";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("purgeRuns", () => {
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

    async function seedLab(labId: string): Promise<void> {
        await client.db.insert(labs).values({
            id: labId,
            goal: `Goal for ${labId}`,
            input: { goal: `Goal for ${labId}`, context: [], success_criteria: [] },
            workspacePath: `/tmp/${labId}`
        });
        await client.db.insert(assumptions).values({
            id: `assumption-${labId}`,
            labId,
            statement: `Bet for ${labId}`,
            rationale: "Seeded by an integration test"
        });
        await client.db.insert(agentRuns).values({
            id: `run-${labId}`,
            labId,
            assumptionId: `assumption-${labId}`,
            role: AgentRole.RESEARCHER,
            objective: `Spend the bet for ${labId}`,
            cwd: `/tmp/${labId}`
        });
        await client.db.insert(findings).values({
            id: `finding-${labId}`,
            labId,
            assumptionId: `assumption-${labId}`,
            runId: `run-${labId}`,
            claim: `Claim for ${labId}`,
            work: "Seeded by an integration test"
        });
        await client.db.insert(events).values({
            id: `event-${labId}`,
            labId,
            type: EventType.LAB_STARTED,
            payload: {}
        });
    }

    async function seedWorkspace(labIds: readonly string[]): Promise<string> {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-purge-integration-"));
        for (const labId of labIds) {
            const runDirectory = path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY, labId);
            await mkdir(runDirectory, { recursive: true });
            await writeFile(path.join(runDirectory, "report.md"), `Report for ${labId}`);
        }
        return workspaceRoot;
    }

    it("cascades the delete to assumptions, findings, and events", async () => {
        await seedLab("lab-alpha");
        const workspaceRoot = await seedWorkspace(["lab-alpha"]);

        const result = await purgeRuns({
            workspaceRoot,
            databaseUrl: databaseUrl as string,
            scope: PurgeScope.ALL
        });

        expect(result.purgedLabRowCount).toBe(1);
        expect(result.purgedDirectoryCount).toBe(1);
        expect(await client.db.select().from(assumptions)).toEqual([]);
        expect(await client.db.select().from(findings)).toEqual([]);
        expect(await client.db.select().from(events)).toEqual([]);
    });

    it("retains the current run and its rows", async () => {
        await seedLab("lab-alpha");
        await seedLab("lab-beta");
        const workspaceRoot = await seedWorkspace(["lab-alpha", "lab-beta"]);
        await writeCurrentPointer(workspaceRoot, {
            lab_id: "lab-beta",
            run_directory: path.join(workspaceRoot, WorkspaceLayout.RUNS_DIRECTORY, "lab-beta")
        });

        const result = await purgeRuns({
            workspaceRoot,
            databaseUrl: databaseUrl as string,
            scope: PurgeScope.EXCEPT_CURRENT
        });

        expect(result.purgedLabIds).toEqual(["lab-alpha"]);
        expect(result.keptLabId).toBe("lab-beta");
        expect((await client.db.select().from(labs)).map((row) => row.id)).toEqual(["lab-beta"]);
        expect((await client.db.select().from(findings)).map((row) => row.id)).toEqual([
            "finding-lab-beta"
        ]);
    });

    it("plans rows that outlived their run directory", async () => {
        await seedLab("lab-orphan");
        const workspaceRoot = await seedWorkspace([]);

        const plan = await planPurge({ workspaceRoot, databaseUrl: databaseUrl as string });

        expect(plan.labIds).toEqual(["lab-orphan"]);
    });
});
