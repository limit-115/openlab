import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
import { InvestigationInputSchema } from "@lab/protocol/investigation-input/investigation-input.schema";
import { InvestigationState } from "@lab/protocol/investigation-lifecycle/investigation-state.const";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { WorkspaceFile } from "#src/investigation-workspace/investigation-workspace.const";

function goal(text: string) {
    return InvestigationInputSchema.parse({ goal: text });
}

/**
 * Reopens an investigation the way the registry does on startup: from the database checkpoint,
 * which is what makes the run directory disposable.
 */
async function reopen(
    workspaceRoot: string,
    persistence: RuntimePersistence,
    investigationId: string
): Promise<InvestigationWorkspace> {
    const persisted = await persistence.load(investigationId);
    if (persisted === undefined) {
        throw new Error(`Expected a persisted runtime for ${investigationId}`);
    }
    return InvestigationWorkspace.open(workspaceRoot, persisted, persistence);
}

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

    it("namespaces entities across investigations that share a goal", async () => {
        const workspaceRoot = await mkdtemp(path.join(tmpdir(), "lab-pg-multiple-runs-"));
        const persistence = new RuntimePersistence(client.db);
        const first = await InvestigationWorkspace.create(
            workspaceRoot,
            goal("Run the first independent investigation"),
            persistence
        );
        const second = await InvestigationWorkspace.create(
            workspaceRoot,
            goal("Run the second independent investigation"),
            persistence
        );
        await second.transition(InvestigationState.FAILED, "Exercise a terminal rerun", {
            failureReason: "Exercise a terminal rerun"
        });
        const repeated = await InvestigationWorkspace.create(
            workspaceRoot,
            goal("Run the second independent investigation"),
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
        const persistence = new RuntimePersistence(client.db);
        const workspace = await InvestigationWorkspace.create(
            workspaceRoot,
            goal("Commit one atomic transition"),
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
        const persistence = new RuntimePersistence(client.db);
        const workspace = await InvestigationWorkspace.create(
            workspaceRoot,
            goal("Reject a stale transition"),
            persistence
        );
        const persistedBefore = await persistence.load(workspace.investigationId);
        if (persistedBefore === undefined) {
            throw new Error("Expected an initialized persisted runtime");
        }
        const beforeSnapshot = workspace.getSnapshot();
        const beforeEvents = workspace.getEvents();
        const [beforeStatusFile, beforeEventsFile] = await Promise.all([
            readFile(path.join(workspace.runDirectory, WorkspaceFile.STATUS), "utf8"),
            readFile(path.join(workspace.runDirectory, WorkspaceFile.EVENTS), "utf8")
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
                readFile(path.join(workspace.runDirectory, WorkspaceFile.STATUS), "utf8"),
                readFile(path.join(workspace.runDirectory, WorkspaceFile.EVENTS), "utf8")
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
        const persistence = new RuntimePersistence(client.db);
        const workspace = await InvestigationWorkspace.create(
            workspaceRoot,
            goal("Recover the authoritative state"),
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
            writeFile(path.join(workspace.runDirectory, WorkspaceFile.STATUS), "corrupt"),
            writeFile(path.join(workspace.runDirectory, WorkspaceFile.EVENTS), "corrupt"),
            writeFile(path.join(workspace.runDirectory, WorkspaceFile.ASSUMPTIONS), "corrupt")
        ]);

        const recovered = await reopen(workspaceRoot, persistence, workspace.investigationId);

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
            readFile(path.join(workspace.runDirectory, WorkspaceFile.STATUS), "utf8").then(
                JSON.parse
            )
        ).resolves.toMatchObject({ investigation: { id: workspace.investigationId } });
        await expect(
            readFile(path.join(workspace.runDirectory, WorkspaceFile.ASSUMPTIONS), "utf8").then(
                JSON.parse
            )
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
        await writeFile(path.join(workspace.runDirectory, WorkspaceFile.STATUS), "corrupt");

        const recoveredCapabilityWorkspace = await reopen(
            workspaceRoot,
            persistence,
            workspace.investigationId
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
});
