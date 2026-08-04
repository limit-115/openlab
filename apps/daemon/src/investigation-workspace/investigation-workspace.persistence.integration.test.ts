import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createDatabase, type DatabaseClient } from "@lab/db/lab-database/lab-database-client";
import { agentRuns, assumptions, investigations } from "@lab/db/lab-database/lab-schema";
import { migrateDatabase } from "@lab/db/lab-database/lab-schema-migration";
import { RuntimePersistence } from "@lab/db/runtime/runtime-persistence";
import { RuntimeRevisionConflictError } from "@lab/db/runtime/runtime-revision-conflict";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AssumptionStatus } from "@lab/protocol/assumptions/assumption-status.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { FindingStatus } from "@lab/protocol/findings/finding-status.const";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";

/** Seeds one bet and the run that took it, which is the smallest projectable research state. */
async function seedBet(workspace: InvestigationWorkspace, statement: string): Promise<string> {
    const id = `assumption-${randomUUID()}`;
    await workspace.update((draft) => {
        const timestamp = draft.investigation.updated_at;
        draft.assumptions.push({
            id,
            cycle: 0,
            statement,
            rationale: "Recorded by an integration test",
            status: AssumptionStatus.RESEARCHING,
            created_at: timestamp,
            updated_at: timestamp
        });
        draft.runs.push({
            id: `run-${id}`,
            role: AgentRole.RESEARCHER,
            assumption_id: id,
            objective: statement,
            status: AgentRunStatus.RUNNING,
            cwd: workspace.runDirectory,
            started_at: timestamp
        });
    });
    return id;
}

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("InvestigationWorkspace PostgreSQL 18 recovery", () => {
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

    it("namespaces initial entities across independent and repeated investigations", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-multiple-runs-"));
        const firstTaskPath = path.join(workspaceRoot, "first-task.json");
        const secondTaskPath = path.join(workspaceRoot, "second-task.json");
        await Promise.all([
            writeFile(
                firstTaskPath,
                JSON.stringify({ goal: "Run the first independent investigation" })
            ),
            writeFile(
                secondTaskPath,
                JSON.stringify({ goal: "Run the second independent investigation" })
            )
        ]);
        const persistence = new RuntimePersistence(client.db);
        const first = await InvestigationWorkspace.initialize(
            workspaceRoot,
            firstTaskPath,
            persistence
        );
        const second = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            secondTaskPath,
            persistence
        );
        await second.transition(InvestigationState.FAILED, "Exercise a terminal rerun", {
            failureReason: "Exercise a terminal rerun"
        });
        const repeated = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            secondTaskPath,
            persistence
        );

        expect(
            new Set([first.investigationId, second.investigationId, repeated.investigationId]).size
        ).toBe(3);
        await seedBet(first, "The first investigation bets here");
        await seedBet(repeated, "The rerun bets somewhere else");
        const projectedAssumptions = await client.db.select().from(assumptions);
        const projectedRuns = await client.db.select().from(agentRuns);
        expect(projectedAssumptions.map(({ investigationId }) => investigationId).sort()).toEqual(
            [first.investigationId, repeated.investigationId].sort()
        );
        expect(projectedRuns.map(({ investigationId }) => investigationId).sort()).toEqual(
            [first.investigationId, repeated.investigationId].sort()
        );
    });

    it("commits a state transition and its event in one runtime revision", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-atomic-transition-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Commit one atomic transition" }));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await InvestigationWorkspace.initialize(
            workspaceRoot,
            taskPath,
            persistence
        );
        const before = await persistence.load(workspace.investigationId);
        if (before === undefined) {
            throw new Error("Expected an initialized persisted runtime");
        }

        const transitioned = await workspace.transition(InvestigationState.STOPPED, "Atomic stop");

        const after = await persistence.load(workspace.investigationId);
        expect(after?.checkpoint.revision).toBe(before.checkpoint.revision + 1);
        expect(after?.checkpoint.snapshot).toEqual(transitioned);
        expect(workspace.getSnapshot()).toEqual(transitioned);
        expect(workspace.getEvents()).toEqual([
            expect.objectContaining({
                type: EventType.INVESTIGATION_STATE_CHANGED,
                payload: { state: InvestigationState.STOPPED, reason: "Atomic stop" }
            })
        ]);
        expect(await persistence.eventsAfter(workspace.investigationId)).toEqual([
            expect.objectContaining({
                type: EventType.INVESTIGATION_STATE_CHANGED,
                payload: { state: InvestigationState.STOPPED, reason: "Atomic stop" }
            })
        ]);
    });

    it("rolls back a stale state transition without a ghost event or local mutation", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-stale-transition-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Reject a stale transition" }));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await InvestigationWorkspace.initialize(
            workspaceRoot,
            taskPath,
            persistence
        );
        const persistedBefore = await persistence.load(workspace.investigationId);
        if (persistedBefore === undefined) {
            throw new Error("Expected an initialized persisted runtime");
        }
        const beforeSnapshot = workspace.getSnapshot();
        const beforeEvents = workspace.getEvents();
        const [beforeStatusFile, beforeEventsFile] = await Promise.all([
            readFile(path.join(workspace.runDirectory, "status.json"), "utf8"),
            readFile(path.join(workspace.runDirectory, "events.json"), "utf8")
        ]);
        const externalSnapshot = structuredClone(beforeSnapshot);
        const externalTimestamp = new Date(
            Date.parse(externalSnapshot.investigation.updated_at) + 1_000
        ).toISOString();
        externalSnapshot.investigation.updated_at = externalTimestamp;
        externalSnapshot.assumptions.push({
            id: "assumption-concurrent-writer",
            cycle: 0,
            statement: "A concurrent writer committed first",
            rationale: "Recorded by another process",
            status: AssumptionStatus.OPEN,
            created_at: externalTimestamp,
            updated_at: externalTimestamp
        });
        const externalCommit = await persistence.commit({
            snapshot: externalSnapshot,
            expectedRevision: persistedBefore.checkpoint.revision
        });

        await expect(
            workspace.transition(InvestigationState.STOPPED, "Stale stop")
        ).rejects.toBeInstanceOf(RuntimeRevisionConflictError);

        expect(workspace.getSnapshot()).toEqual(beforeSnapshot);
        expect(workspace.getEvents()).toEqual(beforeEvents);
        await expect(
            Promise.all([
                readFile(path.join(workspace.runDirectory, "status.json"), "utf8"),
                readFile(path.join(workspace.runDirectory, "events.json"), "utf8")
            ])
        ).resolves.toEqual([beforeStatusFile, beforeEventsFile]);
        const persisted = await persistence.load(workspace.investigationId);
        expect(persisted?.checkpoint.revision).toBe(externalCommit.revision);
        expect(
            persisted?.checkpoint.snapshot.assumptions.map(({ statement }) => statement)
        ).toContain("A concurrent writer committed first");
        expect(persisted?.checkpoint.snapshot.investigation.state).toBe(InvestigationState.RUNNING);
        expect(await persistence.eventsAfter(workspace.investigationId)).toEqual([]);
    });

    it("repairs corrupt filesystem snapshots from the atomic database checkpoint", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-recovery-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Recover the authoritative state" }));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await InvestigationWorkspace.initialize(
            workspaceRoot,
            taskPath,
            persistence
        );

        await workspace.appendEvent(EventType.INVESTIGATION_STARTED, {
            source: "integration-test"
        });
        const assumptionId = await seedBet(workspace, "PostgreSQL checkpoint survived");
        await workspace.update((draft) => {
            const timestamp = draft.investigation.updated_at;
            draft.findings.push({
                id: "finding-durable",
                assumption_id: assumptionId,
                run_id: `run-${assumptionId}`,
                claim: "PostgreSQL preserves what the researcher claimed",
                work: "Wrote the claim, restarted the runtime, read it back",
                artifact_paths: [],
                status: FindingStatus.UNVERIFIED,
                created_at: timestamp
            });
        });
        await Promise.all([
            writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "events.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "assumptions.json"), "corrupt")
        ]);

        const recovered = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            persistence
        );

        expect(recovered.recovered).toBe(true);
        expect(recovered.investigationId).toBe(workspace.investigationId);
        expect(recovered.getSnapshot().assumptions.map(({ statement }) => statement)).toContain(
            "PostgreSQL checkpoint survived"
        );
        expect(recovered.getSnapshot().findings.map(({ id }) => id)).toEqual(["finding-durable"]);
        expect(recovered.getEvents().map(({ type }) => type)).toContain(
            EventType.INVESTIGATION_STARTED
        );
        await expect(
            readFile(path.join(workspace.runDirectory, "status.json"), "utf8").then(JSON.parse)
        ).resolves.toMatchObject({ investigation: { id: workspace.investigationId } });
        await expect(
            readFile(path.join(workspace.runDirectory, "assumptions.json"), "utf8").then(JSON.parse)
        ).resolves.toMatchObject([{ id: assumptionId, findings: [{ id: "finding-durable" }] }]);
        expect(
            await client.db.query.findings.findFirst({
                where: (finding, { eq }) => eq(finding.id, "finding-durable")
            })
        ).toMatchObject({
            investigationId: workspace.investigationId,
            assumptionId,
            status: FindingStatus.UNVERIFIED
        });

        const request = await recovered.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace",
            selfProvisioningAttempt:
                "Rebuilt it from public mirrors, which overlap the training set",
            blocking: true
        });
        await recovered.answerCapability(request.id, "Mounted at /srv/corpora/independent-v1");
        await writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt");

        const recoveredCapabilityWorkspace = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            persistence
        );
        const capability = recoveredCapabilityWorkspace
            .getSnapshot()
            .capability_requests.find(({ id }) => id === request.id);
        expect(capability).toMatchObject({
            status: CapabilityStatus.ANSWERED,
            answer: "Mounted at /srv/corpora/independent-v1"
        });
        expect(capability?.answered_at).toBeDefined();
        expect(
            await client.db.query.capabilityRequests.findFirst({
                where: (capability, { eq }) => eq(capability.id, request.id)
            })
        ).toMatchObject({
            status: CapabilityStatus.ANSWERED,
            answer: "Mounted at /srv/corpora/independent-v1",
            answeredAt: new Date(capability?.answered_at ?? "")
        });
    });

    it("repairs a swapped pointer in the canonical investigation directory without touching the other investigation", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-swapped-pointer-"));
        const firstTaskPath = path.join(workspaceRoot, "task-a.json");
        const secondTaskPath = path.join(workspaceRoot, "task-b.json");
        const firstTask = {
            id: `task-swapped-a-${randomUUID()}`,
            goal: "Recover investigation A in its canonical directory",
            context: ["Investigation B must remain untouched"],
            success_criteria: ["The pointer identifies exactly one persisted runtime"]
        };
        const secondTask = {
            id: `task-swapped-b-${randomUUID()}`,
            goal: "Keep investigation B isolated",
            context: [],
            success_criteria: []
        };
        await Promise.all([
            writeFile(firstTaskPath, JSON.stringify(firstTask)),
            writeFile(secondTaskPath, JSON.stringify(secondTask))
        ]);
        const persistence = new RuntimePersistence(client.db);
        const first = await InvestigationWorkspace.initialize(
            workspaceRoot,
            firstTaskPath,
            persistence
        );
        const second = await InvestigationWorkspace.initialize(
            workspaceRoot,
            secondTaskPath,
            persistence
        );
        const corruptedSecondFiles = {
            task: "corrupt-b-task",
            status: "corrupt-b-status",
            events: "corrupt-b-events",
            assumptions: "corrupt-b-assumptions"
        } as const;
        await Promise.all([
            writeFile(path.join(second.runDirectory, "task.json"), corruptedSecondFiles.task),
            writeFile(path.join(second.runDirectory, "status.json"), corruptedSecondFiles.status),
            writeFile(path.join(second.runDirectory, "events.json"), corruptedSecondFiles.events),
            writeFile(
                path.join(second.runDirectory, "assumptions.json"),
                corruptedSecondFiles.assumptions
            ),
            writeFile(
                path.join(workspaceRoot, "current.json"),
                JSON.stringify({
                    investigation_id: first.investigationId,
                    run_directory: second.runDirectory
                })
            )
        ]);

        const recovered = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            firstTaskPath,
            persistence
        );

        expect(recovered.investigationId).toBe(first.investigationId);
        expect(recovered.runDirectory).toBe(first.runDirectory);
        await expect(recovered.getTask()).resolves.toEqual(firstTask);
        await expect(readCurrentPointer(workspaceRoot)).resolves.toEqual({
            investigation_id: first.investigationId,
            run_directory: first.runDirectory
        });
        await expect(
            Promise.all([
                readFile(path.join(second.runDirectory, "task.json"), "utf8"),
                readFile(path.join(second.runDirectory, "status.json"), "utf8"),
                readFile(path.join(second.runDirectory, "events.json"), "utf8"),
                readFile(path.join(second.runDirectory, "assumptions.json"), "utf8")
            ])
        ).resolves.toEqual([
            corruptedSecondFiles.task,
            corruptedSecondFiles.status,
            corruptedSecondFiles.events,
            corruptedSecondFiles.assumptions
        ]);
    });

    it("repairs a corrupt canonical task file from the persisted runtime", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-corrupt-task-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        const task = {
            id: `task-corrupt-canonical-${randomUUID()}`,
            goal: "Recover the canonical task input",
            context: ["PostgreSQL stores the accepted input"],
            success_criteria: ["task.json is repaired without creating another investigation"]
        };
        await writeFile(taskPath, JSON.stringify(task));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await InvestigationWorkspace.initialize(
            workspaceRoot,
            taskPath,
            persistence
        );
        await writeFile(path.join(workspace.runDirectory, "task.json"), "corrupt-canonical-task");

        const recovered = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            persistence
        );

        expect(recovered.investigationId).toBe(workspace.investigationId);
        expect(recovered.runDirectory).toBe(workspace.runDirectory);
        await expect(recovered.getTask()).resolves.toEqual(task);
        await expect(
            readFile(path.join(workspace.runDirectory, "task.json"), "utf8").then(JSON.parse)
        ).resolves.toEqual(task);
    });

    it("recovers the latest matching runtime and repairs a missing current pointer", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-missing-pointer-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        const task = {
            id: `task-missing-pointer-${randomUUID()}`,
            goal: "Recover without a filesystem pointer",
            context: ["The database remains available"],
            success_criteria: ["The same investigation resumes"]
        };
        await writeFile(taskPath, JSON.stringify(task));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await InvestigationWorkspace.initialize(
            workspaceRoot,
            taskPath,
            persistence
        );
        await seedBet(workspace, "Latest database state");
        await Promise.all([
            unlink(path.join(workspaceRoot, "current.json")),
            writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "events.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "assumptions.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "task.json"), "corrupt")
        ]);

        const recovered = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            persistence
        );

        expect(recovered.recovered).toBe(true);
        expect(recovered.investigationId).toBe(workspace.investigationId);
        expect(recovered.getSnapshot().assumptions.map(({ statement }) => statement)).toContain(
            "Latest database state"
        );
        await expect(recovered.getTask()).resolves.toEqual(task);
        await expect(readCurrentPointer(workspaceRoot)).resolves.toEqual({
            investigation_id: workspace.investigationId,
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
        const workspace = await InvestigationWorkspace.initialize(
            workspaceRoot,
            taskPath,
            persistence
        );
        await workspace.appendEvent(EventType.ASSUMPTIONS_PROPOSED, {
            source: "corrupt-pointer-test"
        });
        await Promise.all([
            writeFile(path.join(workspaceRoot, "current.json"), "{not-json"),
            writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "events.json"), "corrupt")
        ]);

        const recovered = await InvestigationWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            persistence
        );

        expect(recovered.recovered).toBe(true);
        expect(recovered.investigationId).toBe(workspace.investigationId);
        expect(recovered.getEvents().map(({ type }) => type)).toContain(
            EventType.ASSUMPTIONS_PROPOSED
        );
        await expect(readCurrentPointer(workspaceRoot)).resolves.toEqual({
            investigation_id: workspace.investigationId,
            run_directory: workspace.runDirectory
        });
    });
});

async function readCurrentPointer(workspaceRoot: string): Promise<unknown> {
    return JSON.parse(await readFile(path.join(workspaceRoot, "current.json"), "utf8"));
}
