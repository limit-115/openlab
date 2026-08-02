import type { SchedulerLane } from "@lab/core/constants";
import { type AgentRole, InternalTaskStatus } from "@lab/protocol/constants";
import { and, eq, gt, sql } from "drizzle-orm";
import type { Database } from "#src/client";
import { AttemptStatus, type AttemptStatus as AttemptStatusValue } from "#src/constants";
import { attempts, tasks } from "#src/schema";

export type TaskRecord = typeof tasks.$inferSelect;
export type AttemptRecord = typeof attempts.$inferSelect;

export interface QueueTaskInput {
    readonly id: string;
    readonly labId: string;
    readonly branchId: string;
    readonly objective: string;
    readonly contextRefs?: readonly string[];
    readonly role: AgentRole;
    readonly lane: SchedulerLane;
    readonly priority?: number;
    readonly availableAt?: Date;
}

export interface LeaseTaskInput {
    readonly labId: string;
    readonly lane: SchedulerLane;
    readonly workerId: string;
    readonly leaseDurationMs: number;
    readonly now?: Date;
}

export interface StartAttemptInput {
    readonly id: string;
    readonly taskId: string;
    readonly workerId: string;
    readonly command?: string;
    readonly cwd?: string;
    readonly inputs?: Readonly<Record<string, unknown>>;
    readonly environment?: Readonly<Record<string, string>>;
    readonly reconciliationKey?: string;
    readonly now?: Date;
}

export interface FinishAttemptInput {
    readonly attemptId: string;
    readonly taskId: string;
    readonly workerId: string;
    readonly status: Exclude<
        AttemptStatusValue,
        typeof AttemptStatus.PLANNED | typeof AttemptStatus.RUNNING
    >;
    readonly exitCode?: number;
    readonly stdoutPath?: string;
    readonly stderrPath?: string;
    readonly outputHash?: string;
    readonly error?: string;
    readonly retryAt?: Date;
    readonly now?: Date;
}

export function calculateLeaseExpiry(now: Date, leaseDurationMs: number): Date {
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 1) {
        throw new RangeError("Lease duration must be a positive safe integer");
    }
    return new Date(now.getTime() + leaseDurationMs);
}

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
                        eq(tasks.status, InternalTaskStatus.RUNNING)
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
