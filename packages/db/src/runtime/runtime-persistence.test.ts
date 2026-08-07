import { AgentHarnessKind } from "@openlab/protocol/agents/agent-execution.const";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import { InvestigationState } from "@openlab/protocol/investigation-lifecycle/investigation-state.const";
import type { StatusSnapshot } from "@openlab/protocol/investigation-status/status-snapshot.types";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDatabase } from "#src/lab-database/lab-database-client";
import { runtimeCheckpoints } from "#src/lab-database/lab-schema";
import { openTestDatabase, type TestDatabase } from "#src/lab-database/test-database";
import { IncompatibleCheckpointError } from "#src/runtime/incompatible-checkpoint";
import { RuntimePersistence } from "#src/runtime/runtime-persistence";
import { RuntimeRevisionConflictError } from "#src/runtime/runtime-revision-conflict";
import {
    makeEvent,
    makeInput,
    makeSnapshot,
    testEventId,
    testInvestigationId
} from "#src/runtime/runtime-snapshot.fixture";

describe("RuntimePersistence", () => {
    let database: TestDatabase;
    let persistence: RuntimePersistence;

    beforeEach(async () => {
        database = await openTestDatabase();
        persistence = new RuntimePersistence(database);
    });

    afterEach(async () => {
        await database.close();
    });

    it("initializes and recovers the complete runtime checkpoint with its event", async () => {
        const input = makeInput();
        const snapshot = makeSnapshot(testInvestigationId("load"), input);
        const event = makeEvent(
            EventType.INVESTIGATION_STARTED,
            snapshot.investigation.id,
            "event-started"
        );

        const initialized = await persistence.initialize({
            task: input,
            workspacePath: "/tmp/lab-runtime-1",
            snapshot,
            event
        });

        expect(initialized.revision).toBe(1);
        expect(initialized.appendedEvent?.sequence).toBeGreaterThan(0);
        expect(initialized.snapshot.recent_events).toEqual([event]);

        const recovered = await persistence.load(snapshot.investigation.id);
        expect(recovered).toEqual({
            task: input,
            workspacePath: "/tmp/lab-runtime-1",
            checkpoint: {
                snapshot: initialized.snapshot,
                revision: 1,
                lastEventSequence: initialized.appendedEvent?.sequence
            },
            persistedAt: snapshot.investigation.updated_at
        });
        expect(recovered?.checkpoint.snapshot.leads).toEqual(snapshot.leads);
        expect(recovered?.checkpoint.snapshot.runs).toEqual(snapshot.runs);
        expect(recovered?.checkpoint.snapshot.findings).toEqual(snapshot.findings);
        expect(recovered?.checkpoint.snapshot.result).toEqual(snapshot.result);
    });

    it("atomically commits snapshot and event and rejects a stale writer without a ghost event", async () => {
        const input = makeInput();
        const snapshot = makeSnapshot(testInvestigationId("conflict"), input);
        await persistence.initialize({
            task: input,
            workspacePath: "/tmp/lab-runtime-2",
            snapshot,
            event: makeEvent(
                EventType.INVESTIGATION_STARTED,
                snapshot.investigation.id,
                "event-started"
            )
        });
        const updated = structuredClone(snapshot);
        updated.investigation.state = InvestigationState.HIBERNATING;
        updated.investigation.reason = "The director has no further leads to open";
        updated.investigation.updated_at = "2026-08-02T00:05:00.000Z";
        const hibernated = makeEvent(
            EventType.INVESTIGATION_HIBERNATED,
            snapshot.investigation.id,
            "event-hibernated",
            updated.investigation.updated_at
        );

        const committed = await persistence.commit({
            snapshot: updated,
            expectedRevision: 1,
            event: hibernated
        });

        expect(committed.revision).toBe(2);
        expect(committed.snapshot.investigation.state).toBe(InvestigationState.HIBERNATING);
        expect(committed.snapshot.recent_events.map(({ id }) => id)).toEqual([
            testEventId(snapshot.investigation.id, "event-started"),
            testEventId(snapshot.investigation.id, "event-hibernated")
        ]);

        const ghost = makeEvent(
            EventType.LEAD_EXHAUSTED,
            snapshot.investigation.id,
            "event-ghost",
            "2026-08-02T00:06:00.000Z"
        );
        await expect(
            persistence.commit({ snapshot: updated, expectedRevision: 1, event: ghost })
        ).rejects.toBeInstanceOf(RuntimeRevisionConflictError);

        const events = await persistence.eventsAfter(snapshot.investigation.id);
        expect(events.map(({ id }) => id)).toEqual([
            testEventId(snapshot.investigation.id, "event-started"),
            testEventId(snapshot.investigation.id, "event-hibernated")
        ]);
        expect(events.map(({ sequence }) => sequence)).toEqual(
            [...events.map(({ sequence }) => sequence)].sort((left, right) => left - right)
        );
    });

    it("lists a settled investigation beside a running one and exposes a resumable event cursor", async () => {
        const runningInput = makeInput();
        const runningSnapshot = makeSnapshot(testInvestigationId("running"), runningInput);
        const running = await persistence.initialize({
            task: runningInput,
            workspacePath: "/tmp/lab-running",
            snapshot: runningSnapshot,
            event: makeEvent(
                EventType.INVESTIGATION_STARTED,
                runningSnapshot.investigation.id,
                "event-running"
            )
        });
        const breakthroughInput = makeInput();
        const breakthroughSnapshot = makeSnapshot(
            testInvestigationId("breakthrough"),
            breakthroughInput,
            InvestigationState.BREAKTHROUGH
        );
        breakthroughSnapshot.breakthrough_finding_id = breakthroughSnapshot.findings[0]?.id;
        await persistence.initialize({
            task: breakthroughInput,
            workspacePath: "/tmp/lab-breakthrough",
            snapshot: breakthroughSnapshot,
            event: makeEvent(
                EventType.BREAKTHROUGH_RECORDED,
                breakthroughSnapshot.investigation.id,
                "event-breakthrough"
            )
        });

        const persisted = await persistence.listPersisted();
        const persistedIds = persisted.map(
            ({ checkpoint }) => checkpoint.snapshot.investigation.id
        );
        expect(persistedIds).toContain(runningSnapshot.investigation.id);
        expect(persistedIds).toContain(breakthroughSnapshot.investigation.id);
        expect(persisted).toContainEqual(
            expect.objectContaining({
                task: runningInput,
                workspacePath: "/tmp/lab-running",
                checkpoint: expect.objectContaining({
                    snapshot: expect.objectContaining({
                        investigation: expect.objectContaining({
                            id: runningSnapshot.investigation.id
                        })
                    })
                }),
                persistedAt: expect.any(String)
            })
        );

        const noReplay = await persistence.eventsAfter(
            runningSnapshot.investigation.id,
            running.lastEventSequence
        );
        expect(noReplay).toEqual([]);
    });

    it("keeps the harnesses an investigation was moved onto, and refuses to move its goal", async () => {
        const input = makeInput();
        const snapshot = makeSnapshot(testInvestigationId("retask"), input);
        await persistence.initialize({
            task: input,
            workspacePath: "/tmp/lab-runtime-retask",
            snapshot
        });

        const moved = await persistence.retask(snapshot.investigation.id, {
            ...input,
            harness_kinds: [AgentHarnessKind.GLM],
            spend_past_caps: true
        });

        expect(moved).toMatchObject({
            harness_kinds: [AgentHarnessKind.GLM],
            spend_past_caps: true
        });
        expect((await persistence.load(snapshot.investigation.id))?.task).toEqual(moved);
        await expect(
            persistence.retask(snapshot.investigation.id, {
                ...input,
                goal: "Chase something else"
            })
        ).rejects.toThrow();
    });

    it("refuses a checkpoint written before a protocol change without hiding the readable ones", async () => {
        const readableInput = makeInput();
        const readableSnapshot = makeSnapshot(testInvestigationId("readable"), readableInput);
        await persistence.initialize({
            task: readableInput,
            workspacePath: "/tmp/lab-readable",
            snapshot: readableSnapshot
        });
        const staleInput = makeInput();
        const staleSnapshot = makeSnapshot(testInvestigationId("stale-contract"), staleInput);
        await persistence.initialize({
            task: staleInput,
            workspacePath: "/tmp/lab-stale-contract",
            snapshot: staleSnapshot,
            event: makeEvent(
                EventType.INVESTIGATION_STARTED,
                staleSnapshot.investigation.id,
                "event-stale-contract"
            )
        });
        const [staleCapability] = staleSnapshot.capability_requests;
        if (staleCapability === undefined) {
            throw new Error("Expected the snapshot fixture to carry a capability request");
        }
        const { provisioning_hint: _dropped, ...withoutProvisioningHint } = staleCapability;
        /** What a build from before the field existed would have left in the column. */
        await database.db
            .update(runtimeCheckpoints)
            .set({
                snapshot: {
                    ...staleSnapshot,
                    capability_requests: [withoutProvisioningHint]
                } as unknown as StatusSnapshot
            })
            .where(eq(runtimeCheckpoints.investigationId, staleSnapshot.investigation.id));

        await expect(persistence.load(staleSnapshot.investigation.id)).rejects.toBeInstanceOf(
            IncompatibleCheckpointError
        );
        const persisted = await persistence.listPersisted();
        const persistedIds = persisted.map(
            ({ checkpoint }) => checkpoint.snapshot.investigation.id
        );
        expect(persistedIds).not.toContain(staleSnapshot.investigation.id);
        expect(persistedIds).toContain(readableSnapshot.investigation.id);
    });

    it("loads a checkpoint through a new database client after process restart", async () => {
        const input = makeInput();
        const snapshot = makeSnapshot(testInvestigationId("restarted"), input);
        await persistence.initialize({
            task: input,
            workspacePath: "/tmp/lab-restarted",
            snapshot,
            event: makeEvent(
                EventType.INVESTIGATION_STARTED,
                snapshot.investigation.id,
                "event-restarted"
            )
        });

        const restarted = createDatabase(database.path);
        try {
            const recovered = await new RuntimePersistence(restarted).load(
                snapshot.investigation.id
            );
            expect(recovered?.checkpoint.snapshot).toEqual({
                ...snapshot,
                recent_events: [
                    makeEvent(
                        EventType.INVESTIGATION_STARTED,
                        snapshot.investigation.id,
                        "event-restarted"
                    )
                ]
            });
        } finally {
            await restarted.close();
        }
    });
});
