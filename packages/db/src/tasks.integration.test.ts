import { SchedulerLane } from "@lab/core/constants";
import { AgentRole, InternalTaskStatus } from "@lab/protocol/constants";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { BranchRepository } from "#src/branches";
import { createDatabase, type DatabaseClient } from "#src/client";
import { AttemptStatus, ExternalEffect } from "#src/constants";
import { LabRepository } from "#src/labs";
import { migrateDatabase } from "#src/migrations";
import { attempts, labs, tasks } from "#src/schema";
import { TaskRepository } from "#src/tasks";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe.sequential;

describeDatabase("TaskRepository PostgreSQL 18 integration", () => {
    let client: DatabaseClient;
    let repository: TaskRepository;

    beforeAll(async () => {
        if (databaseUrl === undefined) {
            return;
        }
        client = createDatabase(databaseUrl, { max: 2 });
        await migrateDatabase(client.db);
        repository = new TaskRepository(client.db);
    });

    beforeEach(async () => {
        await client.db.delete(labs).where(eq(labs.id, "lab-task-repository-integration"));
    });

    afterAll(async () => {
        await client?.close();
    });

    it("rolls back completion from a worker whose lease expired", async () => {
        const now = new Date("2026-08-02T00:00:00.000Z");
        await prepareRunningAttempt(repository, client, {
            leaseDurationMs: 1_000,
            startedAt: new Date(now.getTime() + 100)
        });

        await expect(
            repository.finishAttempt({
                attemptId: "attempt-1",
                taskId: "task-1",
                workerId: "worker-1",
                status: AttemptStatus.SUCCEEDED,
                now: new Date(now.getTime() + 2_000)
            })
        ).rejects.toThrow("lost its lease");

        const attempt = await client.db.query.attempts.findFirst({
            where: eq(attempts.id, "attempt-1")
        });
        const task = await client.db.query.tasks.findFirst({ where: eq(tasks.id, "task-1") });
        expect(attempt?.status).toBe(AttemptStatus.RUNNING);
        expect(task?.status).toBe(InternalTaskStatus.RUNNING);
    });

    it("rejects automatic retry of an irreversible action without reconciliation", async () => {
        const now = new Date("2026-08-02T00:00:00.000Z");
        await prepareRunningAttempt(repository, client, {
            leaseDurationMs: 10_000,
            startedAt: new Date(now.getTime() + 100),
            externalEffect: ExternalEffect.IRREVERSIBLE
        });

        await expect(
            repository.finishAttempt({
                attemptId: "attempt-1",
                taskId: "task-1",
                workerId: "worker-1",
                status: AttemptStatus.FAILED,
                retryAt: new Date(now.getTime() + 5_000),
                now: new Date(now.getTime() + 1_000)
            })
        ).rejects.toThrow("cannot be retried without reconciliation");

        const attempt = await client.db.query.attempts.findFirst({
            where: eq(attempts.id, "attempt-1")
        });
        expect(attempt?.status).toBe(AttemptStatus.RUNNING);
    });

    it("queues a reconciled irreversible action for another attempt", async () => {
        const now = new Date("2026-08-02T00:00:00.000Z");
        await prepareRunningAttempt(repository, client, {
            leaseDurationMs: 10_000,
            startedAt: new Date(now.getTime() + 100),
            externalEffect: ExternalEffect.IRREVERSIBLE,
            reconciliationKey: "external-operation-1"
        });

        const attempt = await repository.finishAttempt({
            attemptId: "attempt-1",
            taskId: "task-1",
            workerId: "worker-1",
            status: AttemptStatus.FAILED,
            retryAt: new Date(now.getTime() + 5_000),
            now: new Date(now.getTime() + 1_000)
        });

        const task = await client.db.query.tasks.findFirst({ where: eq(tasks.id, "task-1") });
        expect(attempt.status).toBe(AttemptStatus.FAILED);
        expect(task).toMatchObject({
            status: InternalTaskStatus.QUEUED,
            attempt: 2,
            leaseOwner: null,
            leaseExpiresAt: null
        });
    });
});

interface RunningAttemptOptions {
    readonly leaseDurationMs: number;
    readonly startedAt: Date;
    readonly externalEffect?: ExternalEffect;
    readonly reconciliationKey?: string;
}

async function prepareRunningAttempt(
    repository: TaskRepository,
    client: DatabaseClient,
    options: RunningAttemptOptions
): Promise<void> {
    const labRepository = new LabRepository(client.db);
    const branchRepository = new BranchRepository(client.db);
    const leasedAt = new Date("2026-08-02T00:00:00.000Z");
    await labRepository.create({
        id: "lab-task-repository-integration",
        input: {
            id: "lab-task-repository-integration",
            goal: "Test task recovery",
            context: [],
            success_criteria: []
        },
        workspacePath: "/tmp/lab-task-integration",
        now: leasedAt
    });
    await branchRepository.create({
        id: "branch-1",
        labId: "lab-task-repository-integration",
        title: "Recovery",
        approach: "Exercise lease semantics",
        lane: SchedulerLane.EXPLORATION,
        now: leasedAt
    });
    await repository.queue({
        id: "task-1",
        labId: "lab-task-repository-integration",
        branchId: "branch-1",
        objective: "Run a recoverable task",
        role: AgentRole.RESEARCHER,
        lane: SchedulerLane.EXPLORATION,
        availableAt: leasedAt
    });
    await repository.leaseNext({
        labId: "lab-task-repository-integration",
        lane: SchedulerLane.EXPLORATION,
        workerId: "worker-1",
        leaseDurationMs: options.leaseDurationMs,
        now: leasedAt
    });
    await repository.startAttempt({
        id: "attempt-1",
        taskId: "task-1",
        workerId: "worker-1",
        ...(options.externalEffect === undefined ? {} : { externalEffect: options.externalEffect }),
        ...(options.reconciliationKey === undefined
            ? {}
            : { reconciliationKey: options.reconciliationKey }),
        now: options.startedAt
    });
}
