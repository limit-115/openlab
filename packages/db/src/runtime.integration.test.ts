import { randomUUID } from "node:crypto";
import { SchedulerLane } from "@lab/core/constants";
import {
    AgentRole,
    AgentStatus,
    BranchStatus,
    CapabilityRequestType,
    CapabilityStatus,
    ClaimStatus,
    EventType,
    InternalTaskStatus,
    LabState
} from "@lab/protocol/constants";
import type { LabEvent, TaskInput } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseClient } from "#src/client";
import { migrateDatabase } from "#src/migrations";
import { RuntimePersistence, RuntimeRevisionConflictError } from "#src/runtime";
import { branches, capabilityRequests, claimDependencies, claims, tasks } from "#src/schema";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;
const testRunId = randomUUID();

describeDatabase("RuntimePersistence PostgreSQL 18 integration", () => {
    let client: DatabaseClient;
    let persistence: RuntimePersistence;

    beforeAll(async () => {
        if (databaseUrl === undefined) {
            return;
        }
        client = createDatabase(databaseUrl, { max: 2 });
        await migrateDatabase(client.db);
        persistence = new RuntimePersistence(client.db);
    });

    afterAll(async () => {
        await client?.close();
    });

    it("initializes and recovers the complete runtime checkpoint with its event", async () => {
        const task = makeTask(testLabId("load"));
        const snapshot = makeSnapshot(task);
        const event = makeEvent(EventType.LAB_STARTED, snapshot.lab.id, "event-started");

        const initialized = await persistence.initialize({
            task,
            workspacePath: "/tmp/lab-runtime-1",
            snapshot,
            event
        });

        expect(initialized.revision).toBe(1);
        expect(initialized.appendedEvent?.sequence).toBeGreaterThan(0);
        expect(initialized.snapshot.recent_events).toEqual([event]);

        const recovered = await persistence.load(snapshot.lab.id);
        expect(recovered).toEqual({
            snapshot: initialized.snapshot,
            revision: 1,
            lastEventSequence: initialized.appendedEvent?.sequence
        });
        expect(recovered?.snapshot.frontier).toEqual(snapshot.frontier);
        expect(recovered?.snapshot.agents).toEqual(snapshot.agents);
        expect(recovered?.snapshot.experiments).toEqual(snapshot.experiments);
        expect(recovered?.snapshot.result).toEqual(snapshot.result);
    });

    it("projects checkpoint state into normalized tables and removes stale rows", async () => {
        const task = makeTask(testLabId("projection"));
        const snapshot = makeSnapshot(task);
        const secondaryBranchId = `${snapshot.lab.id}-branch-secondary`;
        snapshot.branches.push({
            id: secondaryBranchId,
            title: "Alternative",
            approach: "Challenge the primary approach",
            status: BranchStatus.PAUSED,
            progress: "Deferred"
        });

        await persistence.initialize({
            task,
            workspacePath: "/tmp/lab-runtime-projection",
            snapshot
        });

        const initialBranches = await client.db.query.branches.findMany({
            where: eq(branches.labId, snapshot.lab.id)
        });
        expect(initialBranches).toHaveLength(2);
        expect(initialBranches).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: snapshot.branches[0]?.id,
                    lane: SchedulerLane.EXPLORATION,
                    status: BranchStatus.ACTIVE
                }),
                expect.objectContaining({
                    id: secondaryBranchId,
                    status: BranchStatus.PAUSED
                })
            ])
        );
        expect(
            await client.db.query.tasks.findMany({
                where: eq(tasks.labId, snapshot.lab.id)
            })
        ).toEqual([
            expect.objectContaining({
                id: snapshot.tasks[0]?.id,
                lane: SchedulerLane.EXPLORATION,
                status: InternalTaskStatus.RUNNING,
                attempt: 1
            })
        ]);
        expect(
            await client.db.query.claimDependencies.findMany({
                where: eq(claimDependencies.claimId, snapshot.claims[1]?.id ?? "")
            })
        ).toEqual([
            {
                claimId: snapshot.claims[1]?.id,
                dependencyId: snapshot.claims[0]?.id
            }
        ]);
        expect(
            await client.db.query.capabilityRequests.findMany({
                where: eq(capabilityRequests.labId, snapshot.lab.id)
            })
        ).toEqual([
            expect.objectContaining({
                id: snapshot.capability_requests[0]?.id,
                status: CapabilityStatus.OPEN
            })
        ]);

        const updated = structuredClone(snapshot);
        updated.lab.updated_at = "2026-08-02T00:10:00.000Z";
        updated.frontier.updated_at = updated.lab.updated_at;
        updated.branches = updated.branches.filter(({ id }) => id !== secondaryBranchId);
        const projectedTask = updated.tasks[0];
        if (projectedTask === undefined) {
            throw new Error("Projection fixture must contain a task");
        }
        projectedTask.status = InternalTaskStatus.SUCCEEDED;
        projectedTask.attempt = 2;
        const dependentClaim = updated.claims[1];
        if (dependentClaim === undefined) {
            throw new Error("Projection fixture must contain a dependent claim");
        }
        dependentClaim.status = ClaimStatus.TESTING;
        dependentClaim.assumption_ids = [];
        dependentClaim.updated_at = updated.lab.updated_at;
        const capability = updated.capability_requests[0];
        if (capability === undefined) {
            throw new Error("Projection fixture must contain a capability request");
        }
        capability.status = CapabilityStatus.PROVIDED;
        capability.resource_reference = "sandbox://reproducible/v1";
        capability.provided_at = updated.lab.updated_at;

        const committed = await persistence.commit({
            snapshot: updated,
            expectedRevision: 1
        });
        expect(committed.revision).toBe(2);
        expect(
            await client.db.query.branches.findMany({
                where: eq(branches.labId, snapshot.lab.id)
            })
        ).toHaveLength(1);
        expect(
            await client.db.query.tasks.findFirst({
                where: eq(tasks.id, projectedTask.id)
            })
        ).toEqual(
            expect.objectContaining({
                status: InternalTaskStatus.SUCCEEDED,
                attempt: 2
            })
        );
        expect(
            await client.db.query.claims.findFirst({
                where: eq(claims.id, dependentClaim.id)
            })
        ).toEqual(expect.objectContaining({ status: ClaimStatus.TESTING }));
        expect(
            await client.db.query.claimDependencies.findMany({
                where: eq(claimDependencies.claimId, dependentClaim.id)
            })
        ).toEqual([]);
        expect(
            await client.db.query.capabilityRequests.findFirst({
                where: eq(capabilityRequests.id, capability.id)
            })
        ).toEqual(
            expect.objectContaining({
                status: CapabilityStatus.PROVIDED,
                resourceReference: capability.resource_reference,
                providedAt: new Date(updated.lab.updated_at)
            })
        );
        expect((await persistence.load(snapshot.lab.id))?.snapshot.capability_requests).toEqual([
            expect.objectContaining({
                id: capability.id,
                resource_reference: capability.resource_reference,
                provided_at: capability.provided_at
            })
        ]);

        const invalid = structuredClone(updated);
        const invalidTask = invalid.tasks[0];
        if (invalidTask === undefined) {
            throw new Error("Projection fixture must contain a task");
        }
        invalidTask.branch_id = `${snapshot.lab.id}-missing-branch`;
        invalidTask.status = InternalTaskStatus.FAILED;
        invalid.lab.updated_at = "2026-08-02T00:11:00.000Z";
        invalid.frontier.updated_at = invalid.lab.updated_at;
        await expect(
            persistence.commit({
                snapshot: invalid,
                expectedRevision: 2,
                event: makeEvent(
                    EventType.TASK_FAILED,
                    snapshot.lab.id,
                    "event-invalid-projection",
                    invalid.lab.updated_at
                )
            })
        ).rejects.toThrow(`references missing branch ${invalidTask.branch_id}`);

        expect((await persistence.load(snapshot.lab.id))?.revision).toBe(2);
        expect(
            await client.db.query.tasks.findFirst({
                where: eq(tasks.id, invalidTask.id)
            })
        ).toEqual(expect.objectContaining({ status: InternalTaskStatus.SUCCEEDED }));
        expect((await persistence.eventsAfter(snapshot.lab.id)).map(({ id }) => id)).not.toContain(
            testEventId(snapshot.lab.id, "event-invalid-projection")
        );
    });

    it("atomically commits snapshot and event and rejects a stale writer without a ghost event", async () => {
        const task = makeTask(testLabId("conflict"));
        const snapshot = makeSnapshot(task);
        await persistence.initialize({
            task,
            workspacePath: "/tmp/lab-runtime-2",
            snapshot,
            event: makeEvent(EventType.LAB_STARTED, snapshot.lab.id, "event-started")
        });
        const updated = structuredClone(snapshot);
        updated.lab.state = LabState.HIBERNATING;
        updated.lab.reason = "Confirmed plateau";
        updated.frontier.blockers = ["Missing independent evidence"];
        updated.lab.updated_at = "2026-08-02T00:05:00.000Z";
        updated.frontier.updated_at = updated.lab.updated_at;
        const hibernated = makeEvent(
            EventType.LAB_HIBERNATED,
            snapshot.lab.id,
            "event-hibernated",
            updated.lab.updated_at
        );

        const committed = await persistence.commit({
            snapshot: updated,
            expectedRevision: 1,
            event: hibernated
        });

        expect(committed.revision).toBe(2);
        expect(committed.snapshot.lab.state).toBe(LabState.HIBERNATING);
        expect(committed.snapshot.recent_events.map(({ id }) => id)).toEqual([
            testEventId(snapshot.lab.id, "event-started"),
            testEventId(snapshot.lab.id, "event-hibernated")
        ]);

        const ghost = makeEvent(
            EventType.FRONTIER_UPDATED,
            snapshot.lab.id,
            "event-ghost",
            "2026-08-02T00:06:00.000Z"
        );
        await expect(
            persistence.commit({ snapshot: updated, expectedRevision: 1, event: ghost })
        ).rejects.toBeInstanceOf(RuntimeRevisionConflictError);

        const events = await persistence.eventsAfter(snapshot.lab.id);
        expect(events.map(({ id }) => id)).toEqual([
            testEventId(snapshot.lab.id, "event-started"),
            testEventId(snapshot.lab.id, "event-hibernated")
        ]);
        expect(events.map(({ sequence }) => sequence)).toEqual(
            [...events.map(({ sequence }) => sequence)].sort((left, right) => left - right)
        );
    });

    it("finds only recoverable labs and exposes a resumable event cursor", async () => {
        const runningTask = makeTask(testLabId("running"));
        const runningSnapshot = makeSnapshot(runningTask);
        const running = await persistence.initialize({
            task: runningTask,
            workspacePath: "/tmp/lab-running",
            snapshot: runningSnapshot,
            event: makeEvent(EventType.LAB_STARTED, runningSnapshot.lab.id, "event-running")
        });
        const completedTask = makeTask(testLabId("completed"));
        const completedSnapshot = makeSnapshot(completedTask, LabState.COMPLETED);
        await persistence.initialize({
            task: completedTask,
            workspacePath: "/tmp/lab-completed",
            snapshot: completedSnapshot,
            event: makeEvent(EventType.LAB_COMPLETED, completedSnapshot.lab.id, "event-completed")
        });

        const recoverable = await persistence.listRecoverable();
        const recoverableIds = recoverable.map(({ snapshot }) => snapshot.lab.id);
        expect(recoverableIds).toContain(runningSnapshot.lab.id);
        expect(recoverableIds).not.toContain(completedSnapshot.lab.id);

        const noReplay = await persistence.eventsAfter(
            runningSnapshot.lab.id,
            running.lastEventSequence
        );
        expect(noReplay).toEqual([]);
    });

    it("loads a checkpoint through a new database client after process restart", async () => {
        const task = makeTask(testLabId("restarted"));
        const snapshot = makeSnapshot(task);
        await persistence.initialize({
            task,
            workspacePath: "/tmp/lab-restarted",
            snapshot,
            event: makeEvent(EventType.LAB_STARTED, snapshot.lab.id, "event-restarted")
        });

        if (databaseUrl === undefined) {
            throw new Error("TEST_DATABASE_URL is required for this integration test");
        }
        const restartedClient = createDatabase(databaseUrl, { max: 1 });
        try {
            const recovered = await new RuntimePersistence(restartedClient.db).load(
                snapshot.lab.id
            );
            expect(recovered?.snapshot).toEqual({
                ...snapshot,
                recent_events: [
                    makeEvent(EventType.LAB_STARTED, snapshot.lab.id, "event-restarted")
                ]
            });
        } finally {
            await restartedClient.close();
        }
    });
});

function makeTask(id = "lab-runtime"): TaskInput {
    return {
        id,
        goal: "Find a reproducible result",
        context: ["Known observation"],
        success_criteria: ["Independent reproduction"]
    };
}

function testLabId(name: string): string {
    return `lab-${testRunId}-${name}`;
}

function testEventId(labId: string, name: string): string {
    return `${labId}-${name}`;
}

function makeSnapshot(task: TaskInput, state: LabState = LabState.RUNNING): StatusSnapshot {
    const labId = task.id ?? "lab-runtime";
    const timestamp = "2026-08-02T00:00:00.000Z";
    const branchId = `${labId}-branch-director`;
    const taskId = `${labId}-task-director`;
    const assumptionId = `${labId}-claim-assumption`;
    const claimId = `${labId}-claim-primary`;
    return {
        lab: {
            id: labId,
            state,
            goal: task.goal,
            started_at: timestamp,
            updated_at: timestamp,
            uptime_ms: 0
        },
        frontier: {
            known: [...task.context],
            open_questions: [...task.success_criteria],
            blockers: [],
            next_experiments: ["Run a controlled experiment"],
            updated_at: timestamp
        },
        branches: [
            {
                id: branchId,
                title: "Operationalization",
                approach: "Produce falsifiable claims",
                status: BranchStatus.ACTIVE,
                progress: "Ready"
            }
        ],
        agents: [
            {
                id: `${labId}-agent-director`,
                branch_id: branchId,
                role: AgentRole.DIRECTOR,
                status: AgentStatus.WORKING,
                current_task_id: taskId
            }
        ],
        tasks: [
            {
                id: taskId,
                branch_id: branchId,
                objective: "Operationalize the goal",
                context_refs: [],
                status: InternalTaskStatus.RUNNING,
                attempt: 1,
                role: AgentRole.DIRECTOR
            }
        ],
        claims: [
            {
                id: assumptionId,
                branch_id: branchId,
                statement: "The evaluator measures the target outcome",
                status: ClaimStatus.SUPPORTED,
                assumption_ids: [],
                supporting_evidence_ids: [],
                contradicting_evidence_ids: [],
                stale: false,
                created_at: timestamp,
                updated_at: timestamp
            },
            {
                id: claimId,
                branch_id: branchId,
                statement: "The primary approach is reproducible",
                status: ClaimStatus.PROPOSED,
                assumption_ids: [assumptionId],
                supporting_evidence_ids: [],
                contradicting_evidence_ids: [],
                stale: false,
                created_at: timestamp,
                updated_at: timestamp
            }
        ],
        experiments: [],
        capability_requests: [
            {
                id: `${labId}-capability-sandbox`,
                type: CapabilityRequestType.CAPABILITY_REQUEST,
                need: "A reproducible sandbox",
                reason: "The evaluator must run independently",
                provisioning_hint: "Provide an isolated local runtime",
                status: CapabilityStatus.OPEN,
                created_at: timestamp
            }
        ],
        recent_events: [],
        result: {
            summary: "Work in progress",
            limitations: []
        }
    };
}

function makeEvent(
    type: LabEvent["type"],
    labId: string,
    id: string,
    occurredAt = "2026-08-02T00:00:00.000Z"
): LabEvent {
    return {
        id: testEventId(labId, id),
        lab_id: labId,
        type,
        occurred_at: occurredAt,
        payload: { source: "runtime-integration-test" }
    };
}
