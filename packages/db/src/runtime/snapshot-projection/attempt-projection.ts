import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { eq, inArray } from "drizzle-orm";
import { attempts } from "#src/lab-database/lab-schema";
import {
    AttemptProjectionDefault,
    ExperimentAttemptStatus
} from "#src/runtime/snapshot-projection/attempt-projection.const";
import { assertUpserted, idsOf } from "#src/runtime/snapshot-projection/projected-entity-record";
import type { RuntimeProjectionDatabase } from "#src/runtime/snapshot-projection/snapshot-projection.types";
import { ExternalEffect } from "#src/tasks/attempt-execution.const";

export async function upsertAttempts(
    database: RuntimeProjectionDatabase,
    snapshot: StatusSnapshot,
    projectionAt: Date
): Promise<void> {
    const taskIds = idsOf(snapshot.tasks);
    const existingAttempts =
        taskIds.length === 0
            ? []
            : await database
                  .select({
                      id: attempts.id,
                      taskId: attempts.taskId,
                      attemptNumber: attempts.attemptNumber
                  })
                  .from(attempts)
                  .where(inArray(attempts.taskId, taskIds));
    const existingById = new Map(existingAttempts.map((attempt) => [attempt.id, attempt]));
    const occupiedNumbers = new Map<string, Set<number>>();
    for (const attempt of existingAttempts) {
        const occupied = occupiedNumbers.get(attempt.taskId) ?? new Set<number>();
        occupied.add(attempt.attemptNumber);
        occupiedNumbers.set(attempt.taskId, occupied);
    }

    for (const experiment of snapshot.experiments) {
        const task = snapshot.tasks.find(({ id }) => id === experiment.task_id);
        if (task === undefined) {
            throw new Error(
                `Experiment ${experiment.id} references missing task ${experiment.task_id}`
            );
        }
        const existing = existingById.get(experiment.id);
        const attemptNumber =
            existing?.attemptNumber ??
            allocateAttemptNumber(occupiedNumbers, task.id, task.attempt);
        const startedAt = parseOptionalTimestamp(experiment.started_at);
        const finishedAt = parseOptionalTimestamp(experiment.finished_at);
        const records = await database
            .insert(attempts)
            .values({
                id: experiment.id,
                taskId: experiment.task_id,
                attemptNumber,
                workerId: experiment.evaluator,
                status: ExperimentAttemptStatus[experiment.status],
                command: experiment.command,
                cwd: experiment.cwd,
                inputs: {
                    hypothesis: experiment.hypothesis,
                    ...(experiment.execution_fingerprint === undefined
                        ? {}
                        : { execution_fingerprint: experiment.execution_fingerprint })
                },
                environment: {},
                stdoutPath: experiment.output_path,
                outputHash: experiment.output_hash,
                exitCode: experiment.exit_code,
                externalEffect: experiment.external_effect ?? ExternalEffect.NONE,
                reconciliationKey: experiment.reconciliation_key,
                startedAt,
                finishedAt,
                createdAt: startedAt ?? projectionAt,
                updatedAt: projectionAt
            })
            .onConflictDoUpdate({
                target: attempts.id,
                set: {
                    workerId: experiment.evaluator,
                    status: ExperimentAttemptStatus[experiment.status],
                    command: experiment.command,
                    cwd: experiment.cwd,
                    stdoutPath: experiment.output_path ?? null,
                    outputHash: experiment.output_hash ?? null,
                    exitCode: experiment.exit_code ?? null,
                    inputs: {
                        hypothesis: experiment.hypothesis,
                        ...(experiment.execution_fingerprint === undefined
                            ? {}
                            : { execution_fingerprint: experiment.execution_fingerprint })
                    },
                    externalEffect: experiment.external_effect ?? ExternalEffect.NONE,
                    reconciliationKey: experiment.reconciliation_key ?? null,
                    startedAt: startedAt ?? null,
                    finishedAt: finishedAt ?? null,
                    updatedAt: projectionAt
                },
                setWhere: eq(attempts.taskId, experiment.task_id)
            })
            .returning({ id: attempts.id });
        assertUpserted(records, "attempt", experiment.id);
        existingById.set(experiment.id, {
            id: experiment.id,
            taskId: experiment.task_id,
            attemptNumber
        });
    }
}

function allocateAttemptNumber(
    occupiedNumbers: Map<string, Set<number>>,
    taskId: string,
    requestedNumber: number
): number {
    const occupied = occupiedNumbers.get(taskId) ?? new Set<number>();
    let candidate = Math.max(AttemptProjectionDefault.FIRST_ATTEMPT_NUMBER, requestedNumber);
    while (occupied.has(candidate)) {
        candidate += 1;
    }
    occupied.add(candidate);
    occupiedNumbers.set(taskId, occupied);
    return candidate;
}

function parseOptionalTimestamp(value: string | undefined): Date | null {
    return value === undefined ? null : new Date(value);
}
