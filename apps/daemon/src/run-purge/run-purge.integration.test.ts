import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDatabase, type DatabaseClient } from "@lab/db/lab-database/lab-database-client";
import {
    agentRuns,
    assumptions,
    events,
    findings,
    investigations
} from "@lab/db/lab-database/lab-schema";
import { migrateDatabase } from "@lab/db/lab-database/lab-schema-migration";
import { AgentHarnessKind } from "@lab/protocol/agents/agent-execution.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
    WorkspaceFile,
    WorkspaceLayout
} from "#src/investigation-workspace/investigation-workspace.const";
import { planPurge, purgeRuns } from "#src/run-purge/run-purge";

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
        await client?.db.delete(investigations);
    });

    async function seedInvestigation(investigationId: string): Promise<void> {
        await client.db.insert(investigations).values({
            id: investigationId,
            goal: `Goal for ${investigationId}`,
            input: {
                goal: `Goal for ${investigationId}`,
                context: [],
                success_criteria: [],
                harness_kinds: [AgentHarnessKind.CODEX]
            },
            workspacePath: `/tmp/${investigationId}`
        });
        await client.db.insert(assumptions).values({
            id: `assumption-${investigationId}`,
            investigationId,
            statement: `Bet for ${investigationId}`,
            rationale: "Seeded by an integration test"
        });
        await client.db.insert(agentRuns).values({
            id: `run-${investigationId}`,
            investigationId,
            assumptionId: `assumption-${investigationId}`,
            role: AgentRole.RESEARCHER,
            objective: `Spend the bet for ${investigationId}`,
            cwd: `/tmp/${investigationId}`
        });
        await client.db.insert(findings).values({
            id: `finding-${investigationId}`,
            investigationId,
            assumptionId: `assumption-${investigationId}`,
            runId: `run-${investigationId}`,
            claim: `Claim for ${investigationId}`,
            work: "Seeded by an integration test"
        });
        await client.db.insert(events).values({
            id: `event-${investigationId}`,
            investigationId,
            type: EventType.INVESTIGATION_STARTED,
            payload: {}
        });
    }

    async function seedWorkspace(investigationIds: readonly string[]): Promise<string> {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-purge-integration-"));
        for (const investigationId of investigationIds) {
            const runDirectory = path.join(
                workspaceRoot,
                WorkspaceLayout.RUNS_DIRECTORY,
                investigationId
            );
            await mkdir(runDirectory, { recursive: true });
            await writeFile(
                path.join(runDirectory, WorkspaceFile.REPORT),
                `Report for ${investigationId}`
            );
        }
        return workspaceRoot;
    }

    it("cascades the delete to assumptions, findings, and events", async () => {
        await seedInvestigation("investigation-alpha");
        const workspaceRoot = await seedWorkspace(["investigation-alpha"]);

        const result = await purgeRuns({ workspaceRoot, databaseUrl: databaseUrl as string });

        expect(result.purgedInvestigationRowCount).toBe(1);
        expect(result.purgedDirectoryCount).toBe(1);
        expect(await client.db.select().from(assumptions)).toEqual([]);
        expect(await client.db.select().from(findings)).toEqual([]);
        expect(await client.db.select().from(events)).toEqual([]);
    });

    it("empties the lab, leaving no investigation behind", async () => {
        await seedInvestigation("investigation-alpha");
        await seedInvestigation("investigation-beta");
        const workspaceRoot = await seedWorkspace(["investigation-alpha", "investigation-beta"]);

        const result = await purgeRuns({ workspaceRoot, databaseUrl: databaseUrl as string });

        expect(result.purgedInvestigationIds).toEqual([
            "investigation-alpha",
            "investigation-beta"
        ]);
        expect(await client.db.select().from(investigations)).toEqual([]);
        expect(await client.db.select().from(findings)).toEqual([]);
    });

    it("plans rows that outlived their run directory", async () => {
        await seedInvestigation("investigation-orphan");
        const workspaceRoot = await seedWorkspace([]);

        const plan = await planPurge({ workspaceRoot, databaseUrl: databaseUrl as string });

        expect(plan.investigationIds).toEqual(["investigation-orphan"]);
    });
});
