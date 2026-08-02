import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import { EvidenceRelationship } from "@lab/db/claims/evidence-relationship.const";
import { createDatabase, type DatabaseClient } from "@lab/db/lab-database/lab-database-client";
import { branches, labs, tasks } from "@lab/db/lab-database/lab-schema";
import { migrateDatabase } from "@lab/db/lab-database/lab-schema-migration";
import { RuntimePersistence } from "@lab/db/runtime/runtime-persistence";
import { RuntimeRevisionConflictError } from "@lab/db/runtime/runtime-revision-conflict";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { initialResearchIdentifiers } from "#src/research-cycle/research-identifiers";

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

    it("namespaces initial entities across independent and repeated labs", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-multiple-runs-"));
        const firstTaskPath = path.join(workspaceRoot, "first-task.json");
        const secondTaskPath = path.join(workspaceRoot, "second-task.json");
        await Promise.all([
            writeFile(firstTaskPath, JSON.stringify({ goal: "Run the first independent lab" })),
            writeFile(secondTaskPath, JSON.stringify({ goal: "Run the second independent lab" }))
        ]);
        const persistence = new RuntimePersistence(client.db);
        const first = await LabWorkspace.initialize(workspaceRoot, firstTaskPath, persistence);
        const second = await LabWorkspace.openOrCreate(workspaceRoot, secondTaskPath, persistence);
        await second.transition(LabState.STOPPED, "Exercise a terminal rerun");
        const repeated = await LabWorkspace.openOrCreate(
            workspaceRoot,
            secondTaskPath,
            persistence
        );

        expect(new Set([first.labId, second.labId, repeated.labId]).size).toBe(3);
        const projectedBranches = await client.db.select().from(branches);
        const projectedTasks = await client.db.select().from(tasks);
        expect(new Set(projectedBranches.map(({ id }) => id)).size).toBe(3);
        expect(new Set(projectedTasks.map(({ id }) => id)).size).toBe(3);
        expect(projectedBranches.map(({ labId }) => labId).sort()).toEqual(
            [first.labId, second.labId, repeated.labId].sort()
        );
        expect(projectedTasks.map(({ labId }) => labId).sort()).toEqual(
            [first.labId, second.labId, repeated.labId].sort()
        );
    });

    it("commits a state transition and its event in one runtime revision", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-atomic-transition-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Commit one atomic transition" }));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await LabWorkspace.initialize(workspaceRoot, taskPath, persistence);
        const before = await persistence.load(workspace.labId);
        if (before === undefined) {
            throw new Error("Expected an initialized persisted runtime");
        }

        const transitioned = await workspace.transition(LabState.STOPPED, "Atomic stop");

        const after = await persistence.load(workspace.labId);
        expect(after?.checkpoint.revision).toBe(before.checkpoint.revision + 1);
        expect(after?.checkpoint.snapshot).toEqual(transitioned);
        expect(workspace.getSnapshot()).toEqual(transitioned);
        expect(workspace.getEvents()).toEqual([
            expect.objectContaining({
                type: EventType.LAB_STATE_CHANGED,
                payload: { state: LabState.STOPPED, reason: "Atomic stop" }
            })
        ]);
        expect(await persistence.eventsAfter(workspace.labId)).toEqual([
            expect.objectContaining({
                type: EventType.LAB_STATE_CHANGED,
                payload: { state: LabState.STOPPED, reason: "Atomic stop" }
            })
        ]);
    });

    it("rolls back a stale state transition without a ghost event or local mutation", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-stale-transition-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Reject a stale transition" }));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await LabWorkspace.initialize(workspaceRoot, taskPath, persistence);
        const persistedBefore = await persistence.load(workspace.labId);
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
        externalSnapshot.frontier.known.push("A concurrent writer committed first");
        const externalTimestamp = new Date(
            Date.parse(externalSnapshot.lab.updated_at) + 1_000
        ).toISOString();
        externalSnapshot.lab.updated_at = externalTimestamp;
        externalSnapshot.frontier.updated_at = externalTimestamp;
        const externalCommit = await persistence.commit({
            snapshot: externalSnapshot,
            expectedRevision: persistedBefore.checkpoint.revision
        });

        await expect(workspace.transition(LabState.STOPPED, "Stale stop")).rejects.toBeInstanceOf(
            RuntimeRevisionConflictError
        );

        expect(workspace.getSnapshot()).toEqual(beforeSnapshot);
        expect(workspace.getEvents()).toEqual(beforeEvents);
        await expect(
            Promise.all([
                readFile(path.join(workspace.runDirectory, "status.json"), "utf8"),
                readFile(path.join(workspace.runDirectory, "events.json"), "utf8")
            ])
        ).resolves.toEqual([beforeStatusFile, beforeEventsFile]);
        const persisted = await persistence.load(workspace.labId);
        expect(persisted?.checkpoint.revision).toBe(externalCommit.revision);
        expect(persisted?.checkpoint.snapshot.frontier.known).toContain(
            "A concurrent writer committed first"
        );
        expect(persisted?.checkpoint.snapshot.lab.state).toBe(LabState.RUNNING);
        expect(await persistence.eventsAfter(workspace.labId)).toEqual([]);
    });

    it("repairs corrupt filesystem snapshots from the atomic database checkpoint", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-recovery-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        await writeFile(taskPath, JSON.stringify({ goal: "Recover the authoritative state" }));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await LabWorkspace.initialize(workspaceRoot, taskPath, persistence);
        const initialIds = initialResearchIdentifiers(workspace.labId);

        await workspace.appendEvent(EventType.LAB_STARTED, { source: "integration-test" });
        await workspace.update((draft) => {
            draft.frontier.known.push("PostgreSQL checkpoint survived");
            draft.claims.push({
                id: "claim-durable-evidence",
                branch_id: initialIds.branchId,
                statement: "PostgreSQL preserves material evidence",
                status: ClaimStatus.TESTING,
                assumption_ids: [],
                supporting_evidence_ids: ["evidence-durable"],
                contradicting_evidence_ids: [],
                stale: false,
                created_at: draft.lab.updated_at,
                updated_at: draft.lab.updated_at
            });
        });
        const artifactDirectory = path.join(workspace.runDirectory, "artifacts");
        const artifactPath = path.join(artifactDirectory, "durable-evidence.json");
        const artifactContents = JSON.stringify({ reproduced: true });
        await mkdir(artifactDirectory, { recursive: true });
        await writeFile(artifactPath, artifactContents);
        const recordedEvidence = {
            id: "evidence-durable",
            kind: EvidenceKind.EXPERIMENT,
            claim_id: "claim-durable-evidence",
            artifact_path: "artifacts/durable-evidence.json",
            artifact_hash: createHash("sha256").update(artifactContents).digest("hex"),
            summary: "The material artifact survived a runtime restart",
            supports: true,
            independent: false,
            created_at: new Date().toISOString()
        } as const;
        await workspace.recordEvidence(recordedEvidence);
        await Promise.all([
            writeFile(path.join(workspace.runDirectory, "status.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "events.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "evidence.json"), "corrupt")
        ]);

        const recovered = await LabWorkspace.openOrCreate(workspaceRoot, taskPath, persistence);

        expect(recovered.recovered).toBe(true);
        expect(recovered.labId).toBe(workspace.labId);
        expect(recovered.getSnapshot().frontier.known).toContain("PostgreSQL checkpoint survived");
        expect(recovered.getEvents().map(({ type }) => type)).toContain(EventType.LAB_STARTED);
        expect(recovered.getEvidence()).toEqual([recordedEvidence]);
        await expect(
            readFile(path.join(workspace.runDirectory, "status.json"), "utf8").then(JSON.parse)
        ).resolves.toMatchObject({ lab: { id: workspace.labId } });
        await expect(
            readFile(path.join(workspace.runDirectory, "evidence.json"), "utf8").then(JSON.parse)
        ).resolves.toEqual([recordedEvidence]);
        expect(
            await client.db.query.evidence.findFirst({
                where: (evidence, { eq }) => eq(evidence.id, recordedEvidence.id)
            })
        ).toMatchObject({
            labId: workspace.labId,
            sourceBranchId: initialIds.branchId,
            origin: EvidenceOrigin.MODEL_JUDGEMENT,
            valid: true,
            complete: true,
            reproducible: false
        });
        expect(
            await client.db.query.claimEvidence.findFirst({
                where: (link, { eq }) => eq(link.evidenceId, recordedEvidence.id)
            })
        ).toMatchObject({
            claimId: "claim-durable-evidence",
            relationship: EvidenceRelationship.SUPPORTS
        });

        await unlink(path.join(workspace.runDirectory, "evidence.json"));
        const recoveredMissingEvidence = await LabWorkspace.openOrCreate(
            workspaceRoot,
            taskPath,
            persistence
        );
        expect(recoveredMissingEvidence.getEvidence()).toEqual([recordedEvidence]);
        await expect(
            readFile(path.join(workspace.runDirectory, "evidence.json"), "utf8").then(JSON.parse)
        ).resolves.toEqual([recordedEvidence]);

        const request = await recoveredMissingEvidence.requestCapability({
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioningHint: "Mount the dataset in the run workspace"
        });
        await recoveredMissingEvidence.provideCapability(request.id, "dataset://independent/v1");
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

    it("repairs a swapped pointer in the canonical lab directory without touching the other lab", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-swapped-pointer-"));
        const firstTaskPath = path.join(workspaceRoot, "task-a.json");
        const secondTaskPath = path.join(workspaceRoot, "task-b.json");
        const firstTask = {
            id: `task-swapped-a-${randomUUID()}`,
            goal: "Recover lab A in its canonical directory",
            context: ["Lab B must remain untouched"],
            success_criteria: ["The pointer identifies exactly one persisted runtime"]
        };
        const secondTask = {
            id: `task-swapped-b-${randomUUID()}`,
            goal: "Keep lab B isolated",
            context: [],
            success_criteria: []
        };
        await Promise.all([
            writeFile(firstTaskPath, JSON.stringify(firstTask)),
            writeFile(secondTaskPath, JSON.stringify(secondTask))
        ]);
        const persistence = new RuntimePersistence(client.db);
        const first = await LabWorkspace.initialize(workspaceRoot, firstTaskPath, persistence);
        const second = await LabWorkspace.initialize(workspaceRoot, secondTaskPath, persistence);
        const corruptedSecondFiles = {
            task: "corrupt-b-task",
            status: "corrupt-b-status",
            events: "corrupt-b-events",
            evidence: "corrupt-b-evidence"
        } as const;
        await Promise.all([
            writeFile(path.join(second.runDirectory, "task.json"), corruptedSecondFiles.task),
            writeFile(path.join(second.runDirectory, "status.json"), corruptedSecondFiles.status),
            writeFile(path.join(second.runDirectory, "events.json"), corruptedSecondFiles.events),
            writeFile(
                path.join(second.runDirectory, "evidence.json"),
                corruptedSecondFiles.evidence
            ),
            writeFile(
                path.join(workspaceRoot, "current.json"),
                JSON.stringify({
                    lab_id: first.labId,
                    run_directory: second.runDirectory
                })
            )
        ]);

        const recovered = await LabWorkspace.openOrCreate(
            workspaceRoot,
            firstTaskPath,
            persistence
        );

        expect(recovered.labId).toBe(first.labId);
        expect(recovered.runDirectory).toBe(first.runDirectory);
        await expect(recovered.getTask()).resolves.toEqual(firstTask);
        await expect(readCurrentPointer(workspaceRoot)).resolves.toEqual({
            lab_id: first.labId,
            run_directory: first.runDirectory
        });
        await expect(
            Promise.all([
                readFile(path.join(second.runDirectory, "task.json"), "utf8"),
                readFile(path.join(second.runDirectory, "status.json"), "utf8"),
                readFile(path.join(second.runDirectory, "events.json"), "utf8"),
                readFile(path.join(second.runDirectory, "evidence.json"), "utf8")
            ])
        ).resolves.toEqual([
            corruptedSecondFiles.task,
            corruptedSecondFiles.status,
            corruptedSecondFiles.events,
            corruptedSecondFiles.evidence
        ]);
    });

    it("repairs a corrupt canonical task file from the persisted runtime", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-corrupt-task-"));
        const taskPath = path.join(workspaceRoot, "task.json");
        const task = {
            id: `task-corrupt-canonical-${randomUUID()}`,
            goal: "Recover the canonical task input",
            context: ["PostgreSQL stores the accepted input"],
            success_criteria: ["task.json is repaired without creating another lab"]
        };
        await writeFile(taskPath, JSON.stringify(task));
        const persistence = new RuntimePersistence(client.db);
        const workspace = await LabWorkspace.initialize(workspaceRoot, taskPath, persistence);
        await writeFile(path.join(workspace.runDirectory, "task.json"), "corrupt-canonical-task");

        const recovered = await LabWorkspace.openOrCreate(workspaceRoot, taskPath, persistence);

        expect(recovered.labId).toBe(workspace.labId);
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
            writeFile(path.join(workspace.runDirectory, "evidence.json"), "corrupt"),
            writeFile(path.join(workspace.runDirectory, "task.json"), "corrupt")
        ]);

        const recovered = await LabWorkspace.openOrCreate(workspaceRoot, taskPath, persistence);

        expect(recovered.recovered).toBe(true);
        expect(recovered.labId).toBe(workspace.labId);
        expect(recovered.getSnapshot().frontier.known).toContain("Latest database state");
        expect(recovered.getEvidence()).toEqual([]);
        await expect(recovered.getTask()).resolves.toEqual(task);
        await expect(
            readFile(path.join(workspace.runDirectory, "evidence.json"), "utf8").then(JSON.parse)
        ).resolves.toEqual([]);
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
