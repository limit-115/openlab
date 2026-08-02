import { randomUUID } from "node:crypto";
import {
    AgentRole,
    AgentStatus,
    BranchStatus,
    EventType,
    InternalTaskStatus,
    LabState
} from "@lab/protocol/constants";
import type { LabEvent, TaskInput } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseClient } from "#src/client";
import { migrateDatabase } from "#src/migrations";
import { RuntimePersistence, RuntimeRevisionConflictError } from "#src/runtime";

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
                id: "branch-director",
                title: "Operationalization",
                approach: "Produce falsifiable claims",
                status: BranchStatus.ACTIVE,
                progress: "Ready"
            }
        ],
        agents: [
            {
                id: "agent-director",
                branch_id: "branch-director",
                role: AgentRole.DIRECTOR,
                status: AgentStatus.WORKING,
                current_task_id: "task-director"
            }
        ],
        tasks: [
            {
                id: "task-director",
                branch_id: "branch-director",
                objective: "Operationalize the goal",
                context_refs: [],
                status: InternalTaskStatus.RUNNING,
                attempt: 1,
                role: AgentRole.DIRECTOR
            }
        ],
        claims: [],
        experiments: [],
        capability_requests: [],
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
