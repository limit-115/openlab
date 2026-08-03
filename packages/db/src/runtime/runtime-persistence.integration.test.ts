import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseClient } from "#src/lab-database/lab-database-client";
import { migrateDatabase } from "#src/lab-database/lab-schema-migration";
import { IncompatibleCheckpointError } from "#src/runtime/incompatible-checkpoint";
import { RuntimePersistence } from "#src/runtime/runtime-persistence";
import { RuntimeRevisionConflictError } from "#src/runtime/runtime-revision-conflict";
import {
    makeEvent,
    makeSnapshot,
    makeTask,
    testEventId,
    testLabId
} from "#src/runtime/runtime-snapshot.fixture";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

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
            task,
            workspacePath: "/tmp/lab-runtime-1",
            checkpoint: {
                snapshot: initialized.snapshot,
                revision: 1,
                lastEventSequence: initialized.appendedEvent?.sequence
            },
            persistedAt: snapshot.lab.updated_at
        });
        expect(recovered?.checkpoint.snapshot.assumptions).toEqual(snapshot.assumptions);
        expect(recovered?.checkpoint.snapshot.runs).toEqual(snapshot.runs);
        expect(recovered?.checkpoint.snapshot.findings).toEqual(snapshot.findings);
        expect(recovered?.checkpoint.snapshot.result).toEqual(snapshot.result);
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
        updated.lab.reason = "The director has no further bets to place";
        updated.lab.updated_at = "2026-08-02T00:05:00.000Z";
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
            EventType.ASSUMPTION_EXHAUSTED,
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
        const breakthroughTask = makeTask(testLabId("breakthrough"));
        const breakthroughSnapshot = makeSnapshot(breakthroughTask, LabState.BREAKTHROUGH);
        breakthroughSnapshot.breakthrough_finding_id = breakthroughSnapshot.findings[0]?.id;
        await persistence.initialize({
            task: breakthroughTask,
            workspacePath: "/tmp/lab-breakthrough",
            snapshot: breakthroughSnapshot,
            event: makeEvent(
                EventType.BREAKTHROUGH_RECORDED,
                breakthroughSnapshot.lab.id,
                "event-breakthrough"
            )
        });

        const recoverable = await persistence.listRecoverable();
        const recoverableIds = recoverable.map(({ checkpoint }) => checkpoint.snapshot.lab.id);
        expect(recoverableIds).toContain(runningSnapshot.lab.id);
        expect(recoverableIds).not.toContain(breakthroughSnapshot.lab.id);
        expect(recoverable).toContainEqual(
            expect.objectContaining({
                task: runningTask,
                workspacePath: "/tmp/lab-running",
                checkpoint: expect.objectContaining({
                    snapshot: expect.objectContaining({
                        lab: expect.objectContaining({ id: runningSnapshot.lab.id })
                    })
                }),
                persistedAt: expect.any(String)
            })
        );

        const noReplay = await persistence.eventsAfter(
            runningSnapshot.lab.id,
            running.lastEventSequence
        );
        expect(noReplay).toEqual([]);
    });

    it("refuses a checkpoint written before a protocol change without hiding recoverable labs", async () => {
        const staleTask = makeTask(testLabId("stale-contract"));
        const staleSnapshot = makeSnapshot(staleTask);
        await persistence.initialize({
            task: staleTask,
            workspacePath: "/tmp/lab-stale-contract",
            snapshot: staleSnapshot,
            event: makeEvent(EventType.LAB_STARTED, staleSnapshot.lab.id, "event-stale-contract")
        });
        const [staleCapability] = staleSnapshot.capability_requests;
        if (staleCapability === undefined) {
            throw new Error("Expected the snapshot fixture to carry a capability request");
        }
        const { provisioning_hint: _dropped, ...withoutProvisioningHint } = staleCapability;
        await client.sql`
            UPDATE runtime_checkpoints
            SET snapshot = jsonb_set(
                snapshot,
                '{capability_requests}',
                ${JSON.stringify([withoutProvisioningHint])}::jsonb
            )
            WHERE lab_id = ${staleSnapshot.lab.id}
        `;

        await expect(persistence.load(staleSnapshot.lab.id)).rejects.toBeInstanceOf(
            IncompatibleCheckpointError
        );
        const recoverable = await persistence.listRecoverable();
        expect(recoverable.map(({ checkpoint }) => checkpoint.snapshot.lab.id)).not.toContain(
            staleSnapshot.lab.id
        );
        expect(recoverable.length).toBeGreaterThan(0);
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
            expect(recovered?.checkpoint.snapshot).toEqual({
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
