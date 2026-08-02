import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { EvidenceOrigin } from "@lab/core/constants";
import { createDatabase, type DatabaseClient } from "@lab/db/client";
import { EvidenceRelationship } from "@lab/db/constants";
import { migrateDatabase } from "@lab/db/migrations";
import { RuntimePersistence } from "@lab/db/runtime";
import { branches, labs, tasks } from "@lab/db/schema";
import {
    CapabilityStatus,
    ClaimStatus,
    EventType,
    EvidenceKind,
    LabState
} from "@lab/protocol/constants";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { initialResearchIdentifiers } from "#src/research-identifiers";
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
