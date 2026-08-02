import { InternalTaskStatus } from "@lab/protocol/constants";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Database } from "#src/lab-database/lab-database-client";
import { attempts, tasks } from "#src/lab-database/lab-schema";
import { AttemptStatus, ExternalEffect } from "#src/tasks/attempt-execution.const";
import { assertReconciliationKey, assertRetryIsSafe } from "#src/tasks/attempt-retry-safety";
import { calculateLeaseExpiry } from "#src/tasks/task-lease";
import type {
    AttemptRecord,
    FinishAttemptInput,
    LeaseTaskInput,
    QueueTaskInput,
    StartAttemptInput,
    TaskRecord
} from "#src/tasks/task-repository.types";

export class TaskRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async queue(input: QueueTaskInput): Promise<TaskRecord> {
        const [record] = await this.#database
            .insert(tasks)
            .values({
                id: input.id,
                labId: input.labId,
                branchId: input.branchId,
                objective: input.objective,
                contextRefs: [...(input.contextRefs ?? [])],
                role: input.role,
                lane: input.lane,
                priority: input.priority ?? 0,
                availableAt: input.availableAt ?? new Date()
            })
            .returning();
        if (record === undefined) {
            throw new Error(`Failed to queue task ${input.id}`);
        }
        return record;
    }

    async leaseNext(input: LeaseTaskInput): Promise<TaskRecord | undefined> {
        const now = input.now ?? new Date();
        const leaseExpiresAt = calculateLeaseExpiry(now, input.leaseDurationMs);
        const result = await this.#database.execute<{ id: string }>(sql`
            WITH candidate AS (
                SELECT ${tasks.id}
                FROM ${tasks}
                WHERE ${tasks.labId} = ${input.labId}
                    AND ${tasks.lane} = ${input.lane}
                    AND ${tasks.status} = ${InternalTaskStatus.QUEUED}
                    AND ${tasks.availableAt} <= ${sql.param(now, tasks.availableAt)}
                ORDER BY ${tasks.priority} DESC, ${tasks.createdAt} ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            UPDATE ${tasks}
            SET
                status = ${InternalTaskStatus.LEASED},
                lease_owner = ${input.workerId},
                lease_expires_at = ${sql.param(leaseExpiresAt, tasks.leaseExpiresAt)},
                updated_at = ${sql.param(now, tasks.updatedAt)}
            FROM candidate
            WHERE ${tasks.id} = candidate.id
            RETURNING ${tasks.id}
        `);
        const leased = result[0];
        if (leased === undefined) {
            return undefined;
        }
        return this.#database.query.tasks.findFirst({ where: eq(tasks.id, leased.id) });
    }

    async renewLease(
        taskId: string,
        workerId: string,
        leaseDurationMs: number,
        now = new Date()
    ): Promise<boolean> {
        const leaseExpiresAt = calculateLeaseExpiry(now, leaseDurationMs);
        const [record] = await this.#database
            .update(tasks)
            .set({ leaseExpiresAt, updatedAt: now })
            .where(
                and(
                    eq(tasks.id, taskId),
                    eq(tasks.leaseOwner, workerId),
                    sql`${tasks.status} IN (${InternalTaskStatus.LEASED}, ${InternalTaskStatus.RUNNING})`,
                    gt(tasks.leaseExpiresAt, now)
                )
            )
            .returning({ id: tasks.id });
        return record !== undefined;
    }

    async startAttempt(input: StartAttemptInput): Promise<AttemptRecord> {
        const now = input.now ?? new Date();
        assertReconciliationKey(input.reconciliationKey);
        return this.#database.transaction(async (transaction) => {
            const [task] = await transaction
                .update(tasks)
                .set({ status: InternalTaskStatus.RUNNING, updatedAt: now })
                .where(
                    and(
                        eq(tasks.id, input.taskId),
                        eq(tasks.status, InternalTaskStatus.LEASED),
                        eq(tasks.leaseOwner, input.workerId),
                        gt(tasks.leaseExpiresAt, now)
                    )
                )
                .returning({ attempt: tasks.attempt });
            if (task === undefined) {
                throw new Error(`Task ${input.taskId} does not hold an active lease`);
            }

            const [attempt] = await transaction
                .insert(attempts)
                .values({
                    id: input.id,
                    taskId: input.taskId,
                    attemptNumber: task.attempt,
                    workerId: input.workerId,
                    status: AttemptStatus.RUNNING,
                    command: input.command,
                    cwd: input.cwd,
                    inputs: { ...(input.inputs ?? {}) },
                    environment: { ...(input.environment ?? {}) },
                    reconciliationKey: input.reconciliationKey,
                    externalEffect: input.externalEffect ?? ExternalEffect.NONE,
                    startedAt: now,
                    createdAt: now,
                    updatedAt: now
                })
                .returning();
            if (attempt === undefined) {
                throw new Error(`Failed to create attempt ${input.id}`);
            }
            return attempt;
        });
    }

    async finishAttempt(input: FinishAttemptInput): Promise<AttemptRecord> {
        const now = input.now ?? new Date();
        return this.#database.transaction(async (transaction) => {
            const [attempt] = await transaction
                .update(attempts)
                .set({
                    status: input.status,
                    exitCode: input.exitCode,
                    stdoutPath: input.stdoutPath,
                    stderrPath: input.stderrPath,
                    outputHash: input.outputHash,
                    error: input.error,
                    finishedAt: now,
                    updatedAt: now
                })
                .where(
                    and(
                        eq(attempts.id, input.attemptId),
                        eq(attempts.taskId, input.taskId),
                        eq(attempts.workerId, input.workerId),
                        eq(attempts.status, AttemptStatus.RUNNING)
                    )
                )
                .returning();
            if (attempt === undefined) {
                throw new Error(`Attempt ${input.attemptId} is not running for this worker`);
            }

            const retry = input.retryAt !== undefined;
            assertRetryIsSafe(attempt.externalEffect, attempt.reconciliationKey, retry);
            const [task] = await transaction
                .update(tasks)
                .set({
                    status: retry
                        ? InternalTaskStatus.QUEUED
                        : input.status === AttemptStatus.SUCCEEDED
                          ? InternalTaskStatus.SUCCEEDED
                          : input.status === AttemptStatus.CANCELLED
                            ? InternalTaskStatus.CANCELLED
                            : InternalTaskStatus.FAILED,
                    attempt: retry ? sql`${tasks.attempt} + 1` : tasks.attempt,
                    availableAt: input.retryAt ?? now,
                    leaseOwner: null,
                    leaseExpiresAt: null,
                    lastError: input.error ?? null,
                    updatedAt: now
                })
                .where(
                    and(
                        eq(tasks.id, input.taskId),
                        eq(tasks.leaseOwner, input.workerId),
                        eq(tasks.status, InternalTaskStatus.RUNNING),
                        gt(tasks.leaseExpiresAt, now)
                    )
                )
                .returning({ id: tasks.id });
            if (task === undefined) {
                throw new Error(`Task ${input.taskId} lost its lease before completion`);
            }
            return attempt;
        });
    }

    async recoverExpiredLeases(now = new Date()): Promise<readonly string[]> {
        return this.#database.transaction(async (transaction) => {
            const expired = await transaction.execute<{ id: string }>(sql`
                SELECT ${tasks.id}
                FROM ${tasks}
                WHERE ${tasks.status} IN (${InternalTaskStatus.LEASED}, ${InternalTaskStatus.RUNNING})
                    AND ${tasks.leaseExpiresAt} <= ${sql.param(now, tasks.leaseExpiresAt)}
                FOR UPDATE SKIP LOCKED
            `);
            const taskIds = expired.map(({ id }) => id);
            if (taskIds.length === 0) {
                return [];
            }

            await transaction.execute(sql`
                UPDATE ${attempts}
                SET
                    status = ${AttemptStatus.FAILED},
                    error = 'Worker lease expired during attempt',
                    finished_at = ${sql.param(now, attempts.finishedAt)},
                    updated_at = ${sql.param(now, attempts.updatedAt)}
                WHERE ${attempts.taskId} IN (${sql.join(
                    taskIds.map((id) => sql`${id}`),
                    sql`, `
                )})
                    AND ${attempts.status} = ${AttemptStatus.RUNNING}
            `);
            await transaction.execute(sql`
                UPDATE ${tasks}
                SET
                    status = ${InternalTaskStatus.QUEUED},
                    attempt = ${tasks.attempt} + 1,
                    lease_owner = NULL,
                    lease_expires_at = NULL,
                    last_error = 'Worker lease expired',
                    available_at = ${sql.param(now, tasks.availableAt)},
                    updated_at = ${sql.param(now, tasks.updatedAt)}
                WHERE ${tasks.id} IN (${sql.join(
                    taskIds.map((id) => sql`${id}`),
                    sql`, `
                )})
            `);
            return taskIds;
        });
    }
}
