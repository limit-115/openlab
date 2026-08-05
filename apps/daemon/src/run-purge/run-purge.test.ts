import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDatabase, type DatabaseClient } from "@openlab/db/lab-database/lab-database-client";
import {
    agentRuns,
    assumptions,
    events,
    findings,
    investigations
} from "@openlab/db/lab-database/lab-schema";
import { migrateDatabase } from "@openlab/db/lab-database/lab-schema-migration";
import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { AgentRole } from "@openlab/protocol/agents/agent-role.const";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import { afterEach, describe, expect, it } from "vitest";
import {
    WorkspaceFile,
    WorkspaceLayout
} from "#src/investigation-workspace/investigation-workspace.const";
import { labDatabasePath } from "#src/lab-home/lab-home";
import { planPurge, purgeRuns } from "#src/run-purge/run-purge";

describe("purgeRuns", () => {
    let client: DatabaseClient | undefined;

    afterEach(async () => {
        await client?.close();
        client = undefined;
    });

    /**
     * A lab home as the daemon leaves it: the database beside the run directories, so a purge finds
     * both from the one path it is given.
     */
    async function seedLab(investigationIds: readonly string[]): Promise<string> {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-purge-"));
        client = createDatabase(labDatabasePath(workspaceRoot));
        await migrateDatabase(client);
        for (const investigationId of investigationIds) {
            await seedInvestigation(investigationId);
            await seedRunDirectory(workspaceRoot, investigationId);
        }
        return workspaceRoot;
    }

    async function seedInvestigation(investigationId: string): Promise<void> {
        const database = client?.db;
        if (database === undefined) {
            throw new Error("The lab database must be open before an investigation is seeded");
        }
        await database.insert(investigations).values({
            id: investigationId,
            goal: `Goal for ${investigationId}`,
            input: {
                goal: `Goal for ${investigationId}`,
                context: [],
                success_criteria: [],
                harness_kinds: [AgentHarnessKind.CODEX],
                spend_past_caps: false
            },
            workspacePath: `/tmp/${investigationId}`
        });
        await database.insert(assumptions).values({
            id: `assumption-${investigationId}`,
            investigationId,
            statement: `Bet for ${investigationId}`,
            rationale: "Seeded by a purge test"
        });
        await database.insert(agentRuns).values({
            id: `run-${investigationId}`,
            investigationId,
            assumptionId: `assumption-${investigationId}`,
            role: AgentRole.RESEARCHER,
            objective: `Spend the bet for ${investigationId}`,
            cwd: `/tmp/${investigationId}`
        });
        await database.insert(findings).values({
            id: `finding-${investigationId}`,
            investigationId,
            assumptionId: `assumption-${investigationId}`,
            runId: `run-${investigationId}`,
            claim: `Claim for ${investigationId}`,
            work: "Seeded by a purge test"
        });
        await database.insert(events).values({
            id: `event-${investigationId}`,
            investigationId,
            type: EventType.INVESTIGATION_STARTED,
            payload: {}
        });
    }

    async function seedRunDirectory(workspaceRoot: string, investigationId: string): Promise<void> {
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

    it("cascades the delete to assumptions, findings, and events", async () => {
        const workspaceRoot = await seedLab(["investigation-alpha"]);

        const result = await purgeRuns({ workspaceRoot });

        expect(result.purgedInvestigationRowCount).toBe(1);
        expect(result.purgedDirectoryCount).toBe(1);
        expect(await client?.db.select().from(assumptions)).toEqual([]);
        expect(await client?.db.select().from(findings)).toEqual([]);
        expect(await client?.db.select().from(events)).toEqual([]);
    });

    it("empties the lab, leaving no investigation behind", async () => {
        const workspaceRoot = await seedLab(["investigation-alpha", "investigation-beta"]);

        const result = await purgeRuns({ workspaceRoot });

        expect(result.purgedInvestigationIds).toEqual([
            "investigation-alpha",
            "investigation-beta"
        ]);
        expect(await client?.db.select().from(investigations)).toEqual([]);
        expect(await client?.db.select().from(findings)).toEqual([]);
    });

    it("plans rows that outlived their run directory", async () => {
        const workspaceRoot = await seedLab([]);
        await seedInvestigation("investigation-orphan");

        const plan = await planPurge({ workspaceRoot });

        expect(plan.investigationIds).toEqual(["investigation-orphan"]);
    });
});
