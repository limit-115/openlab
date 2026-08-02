import { SchedulerLane } from "@lab/core/scheduling/scheduler-lane.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import { CapabilityStatus } from "@lab/protocol/capabilities/capability-request.const";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, type DatabaseClient } from "#src/lab-database/lab-database-client";
import {
    branches,
    capabilityRequests,
    claimDependencies,
    claims,
    tasks
} from "#src/lab-database/lab-schema";
import { migrateDatabase } from "#src/lab-database/lab-schema-migration";
import { RuntimePersistence } from "#src/runtime/runtime-persistence";
import {
    makeEvent,
    makeSnapshot,
    makeTask,
    testEventId,
    testLabId
} from "#src/runtime/runtime-snapshot.fixture";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("Runtime snapshot normalized table projection", () => {
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
        capability.resource_reference = "toolchain://sandbox/reproducible-v1";
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
        expect(
            (await persistence.load(snapshot.lab.id))?.checkpoint.snapshot.capability_requests
        ).toEqual([
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

        expect((await persistence.load(snapshot.lab.id))?.checkpoint.revision).toBe(2);
        expect(
            await client.db.query.tasks.findFirst({
                where: eq(tasks.id, invalidTask.id)
            })
        ).toEqual(expect.objectContaining({ status: InternalTaskStatus.SUCCEEDED }));
        expect((await persistence.eventsAfter(snapshot.lab.id)).map(({ id }) => id)).not.toContain(
            testEventId(snapshot.lab.id, "event-invalid-projection")
        );
    });
});
