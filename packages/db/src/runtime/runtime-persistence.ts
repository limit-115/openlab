import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { StatusSnapshotSchema } from "@lab/protocol/lab-status/status-snapshot.schema";
import { TaskInputSchema } from "@lab/protocol/research-task/task-input.schema";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Database } from "#src/lab-database/lab-database-client";
import { events, labs, runtimeCheckpoints } from "#src/lab-database/lab-schema";
import { IncompatibleCheckpointError } from "#src/runtime/incompatible-checkpoint";
import { terminalTimestamps } from "#src/runtime/lab-terminal-timestamps";
import {
    checkpointResult,
    toPersistedRuntime,
    withRecentEvents
} from "#src/runtime/runtime-checkpoint-reader";
import { insertEvent, parseEvent, toPersistedEvent } from "#src/runtime/runtime-event-log";
import {
    assertNonEmptyIdentifier,
    assertNonEmptyWorkspacePath,
    assertPageSize,
    assertRevision,
    parseTimestamp
} from "#src/runtime/runtime-metadata-validation";
import { RuntimePersistenceLimit } from "#src/runtime/runtime-persistence.const";
import type {
    CommitRuntimeInput,
    CommitRuntimeResult,
    InitializeRuntimeInput,
    PersistedLabEvent,
    PersistedRuntime,
    RecoverableRuntime
} from "#src/runtime/runtime-persistence.types";
import { RuntimeRevisionConflictError } from "#src/runtime/runtime-revision-conflict";
import { projectRuntimeSnapshot } from "#src/runtime/snapshot-projection/snapshot-projection";

export class RuntimePersistence {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async initialize(input: InitializeRuntimeInput): Promise<CommitRuntimeResult> {
        const task = TaskInputSchema.parse(input.task);
        const snapshot = StatusSnapshotSchema.parse(input.snapshot);
        const event = parseEvent(input.event, snapshot.lab.id);
        assertNonEmptyWorkspacePath(input.workspacePath);
        if (snapshot.lab.goal !== task.goal) {
            throw new Error("The runtime snapshot goal must match the task goal");
        }

        return this.#database.transaction(async (transaction) => {
            const startedAt = parseTimestamp(snapshot.lab.started_at, "lab.started_at");
            const updatedAt = parseTimestamp(snapshot.lab.updated_at, "lab.updated_at");
            await transaction.insert(labs).values({
                id: snapshot.lab.id,
                goal: task.goal,
                input: task,
                state: snapshot.lab.state,
                stateReason: snapshot.lab.reason,
                workspacePath: input.workspacePath,
                startedAt,
                ...terminalTimestamps(snapshot, updatedAt),
                createdAt: startedAt,
                updatedAt
            });

            const appendedEvent =
                event === undefined ? undefined : await insertEvent(transaction, event);
            const canonicalSnapshot = await withRecentEvents(
                transaction,
                snapshot,
                RuntimePersistenceLimit.DEFAULT_EVENT_PAGE
            );
            const [checkpoint] = await transaction
                .insert(runtimeCheckpoints)
                .values({
                    labId: snapshot.lab.id,
                    snapshot: canonicalSnapshot,
                    lastEventSequence: appendedEvent?.sequence,
                    persistedAt: updatedAt
                })
                .returning({
                    revision: runtimeCheckpoints.revision,
                    lastEventSequence: runtimeCheckpoints.lastEventSequence
                });
            if (checkpoint === undefined) {
                throw new Error(`Failed to initialize runtime checkpoint ${snapshot.lab.id}`);
            }
            await projectRuntimeSnapshot(transaction, canonicalSnapshot);
            return checkpointResult(canonicalSnapshot, checkpoint, appendedEvent);
        });
    }

    async commit(input: CommitRuntimeInput): Promise<CommitRuntimeResult> {
        assertRevision(input.expectedRevision);
        const snapshot = StatusSnapshotSchema.parse(input.snapshot);
        const event = parseEvent(input.event, snapshot.lab.id);

        return this.#database.transaction(async (transaction) => {
            const appendedEvent =
                event === undefined ? undefined : await insertEvent(transaction, event);
            const canonicalSnapshot = await withRecentEvents(
                transaction,
                snapshot,
                RuntimePersistenceLimit.DEFAULT_EVENT_PAGE
            );
            const updatedAt = parseTimestamp(snapshot.lab.updated_at, "lab.updated_at");
            const [checkpoint] = await transaction
                .update(runtimeCheckpoints)
                .set({
                    revision: sql`${runtimeCheckpoints.revision} + 1`,
                    snapshot: canonicalSnapshot,
                    ...(appendedEvent === undefined
                        ? {}
                        : { lastEventSequence: appendedEvent.sequence }),
                    persistedAt: updatedAt
                })
                .where(
                    and(
                        eq(runtimeCheckpoints.labId, snapshot.lab.id),
                        eq(runtimeCheckpoints.revision, input.expectedRevision)
                    )
                )
                .returning({
                    revision: runtimeCheckpoints.revision,
                    lastEventSequence: runtimeCheckpoints.lastEventSequence
                });
            if (checkpoint === undefined) {
                throw new RuntimeRevisionConflictError(snapshot.lab.id, input.expectedRevision);
            }

            const [lab] = await transaction
                .update(labs)
                .set({
                    state: snapshot.lab.state,
                    stateReason: snapshot.lab.reason ?? null,
                    ...terminalTimestamps(snapshot, updatedAt),
                    updatedAt
                })
                .where(eq(labs.id, snapshot.lab.id))
                .returning({ id: labs.id });
            if (lab === undefined) {
                throw new Error(`Lab ${snapshot.lab.id} does not exist`);
            }
            await projectRuntimeSnapshot(transaction, canonicalSnapshot);
            return checkpointResult(canonicalSnapshot, checkpoint, appendedEvent);
        });
    }

    async load(labId: string): Promise<PersistedRuntime | undefined> {
        assertNonEmptyIdentifier(labId, "labId");
        const [record] = await this.#database
            .select({
                labId: labs.id,
                task: labs.input,
                workspacePath: labs.workspacePath,
                snapshot: runtimeCheckpoints.snapshot,
                revision: runtimeCheckpoints.revision,
                lastEventSequence: runtimeCheckpoints.lastEventSequence,
                persistedAt: runtimeCheckpoints.persistedAt
            })
            .from(runtimeCheckpoints)
            .innerJoin(labs, eq(labs.id, runtimeCheckpoints.labId))
            .where(eq(runtimeCheckpoints.labId, labId))
            .limit(1);
        if (record === undefined) {
            return undefined;
        }
        return toPersistedRuntime(this.#database, record);
    }

    async listRecoverable(limit = 100): Promise<RecoverableRuntime[]> {
        assertPageSize(limit, RuntimePersistenceLimit.MAX_RECOVERABLE_LABS);
        const records = await this.#database
            .select({
                labId: labs.id,
                task: labs.input,
                workspacePath: labs.workspacePath,
                snapshot: runtimeCheckpoints.snapshot,
                revision: runtimeCheckpoints.revision,
                lastEventSequence: runtimeCheckpoints.lastEventSequence,
                persistedAt: runtimeCheckpoints.persistedAt
            })
            .from(runtimeCheckpoints)
            .innerJoin(labs, eq(labs.id, runtimeCheckpoints.labId))
            .where(inArray(labs.state, [LabState.RUNNING, LabState.HIBERNATING]))
            .orderBy(desc(runtimeCheckpoints.persistedAt))
            .limit(limit);

        const runtimes = await Promise.all(
            records.map(async (record) => {
                try {
                    return await toPersistedRuntime(this.#database, record);
                } catch (error) {
                    if (error instanceof IncompatibleCheckpointError) {
                        return undefined;
                    }
                    throw error;
                }
            })
        );
        return runtimes.filter((runtime): runtime is RecoverableRuntime => runtime !== undefined);
    }

    async eventsAfter(
        labId: string,
        afterSequence: number = 0,
        limit: number = RuntimePersistenceLimit.DEFAULT_EVENT_PAGE
    ): Promise<PersistedLabEvent[]> {
        assertNonEmptyIdentifier(labId, "labId");
        if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) {
            throw new RangeError("Event cursor must be a non-negative safe integer");
        }
        assertPageSize(limit, RuntimePersistenceLimit.MAX_EVENT_PAGE);
        const rows = await this.#database
            .select()
            .from(events)
            .where(and(eq(events.labId, labId), gt(events.sequence, afterSequence)))
            .orderBy(asc(events.sequence))
            .limit(limit);
        return rows.map(toPersistedEvent);
    }
}
