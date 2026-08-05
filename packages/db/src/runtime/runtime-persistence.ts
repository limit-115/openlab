import { InvestigationInputSchema } from "@openlab/protocol/investigation-input/investigation-input.schema";
import type { InvestigationInput } from "@openlab/protocol/investigation-input/investigation-input.types";
import { StatusSnapshotSchema } from "@openlab/protocol/investigation-status/status-snapshot.schema";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import type { TransactionalDatabase } from "#src/lab-database/lab-database-client";
import { events, investigations, runtimeCheckpoints } from "#src/lab-database/lab-schema";
import { IncompatibleCheckpointError } from "#src/runtime/incompatible-checkpoint";
import { terminalTimestamps } from "#src/runtime/investigation-terminal-timestamps";
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
    PersistedInvestigationEvent,
    PersistedRuntime
} from "#src/runtime/runtime-persistence.types";
import { RuntimeRevisionConflictError } from "#src/runtime/runtime-revision-conflict";
import { projectRuntimeSnapshot } from "#src/runtime/snapshot-projection/snapshot-projection";

export class RuntimePersistence {
    readonly #database: TransactionalDatabase;

    constructor(database: TransactionalDatabase) {
        this.#database = database;
    }

    async initialize(input: InitializeRuntimeInput): Promise<CommitRuntimeResult> {
        const task = InvestigationInputSchema.parse(input.task);
        const snapshot = StatusSnapshotSchema.parse(input.snapshot);
        const event = parseEvent(input.event, snapshot.investigation.id);
        assertNonEmptyWorkspacePath(input.workspacePath);
        if (snapshot.investigation.goal !== task.goal) {
            throw new Error("The runtime snapshot goal must match the task goal");
        }

        return this.#database.transaction(async (transaction) => {
            const startedAt = parseTimestamp(
                snapshot.investigation.started_at,
                "investigation.started_at"
            );
            const updatedAt = parseTimestamp(
                snapshot.investigation.updated_at,
                "investigation.updated_at"
            );
            await transaction.insert(investigations).values({
                id: snapshot.investigation.id,
                goal: task.goal,
                input: task,
                state: snapshot.investigation.state,
                stateReason: snapshot.investigation.reason,
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
                    investigationId: snapshot.investigation.id,
                    snapshot: canonicalSnapshot,
                    lastEventSequence: appendedEvent?.sequence,
                    persistedAt: updatedAt
                })
                .returning({
                    revision: runtimeCheckpoints.revision,
                    lastEventSequence: runtimeCheckpoints.lastEventSequence
                });
            if (checkpoint === undefined) {
                throw new Error(
                    `Failed to initialize runtime checkpoint ${snapshot.investigation.id}`
                );
            }
            await projectRuntimeSnapshot(transaction, canonicalSnapshot);
            return checkpointResult(canonicalSnapshot, checkpoint, appendedEvent);
        });
    }

    async commit(input: CommitRuntimeInput): Promise<CommitRuntimeResult> {
        assertRevision(input.expectedRevision);
        const snapshot = StatusSnapshotSchema.parse(input.snapshot);
        const event = parseEvent(input.event, snapshot.investigation.id);

        return this.#database.transaction(async (transaction) => {
            const appendedEvent =
                event === undefined ? undefined : await insertEvent(transaction, event);
            const canonicalSnapshot = await withRecentEvents(
                transaction,
                snapshot,
                RuntimePersistenceLimit.DEFAULT_EVENT_PAGE
            );
            const updatedAt = parseTimestamp(
                snapshot.investigation.updated_at,
                "investigation.updated_at"
            );
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
                        eq(runtimeCheckpoints.investigationId, snapshot.investigation.id),
                        eq(runtimeCheckpoints.revision, input.expectedRevision)
                    )
                )
                .returning({
                    revision: runtimeCheckpoints.revision,
                    lastEventSequence: runtimeCheckpoints.lastEventSequence
                });
            if (checkpoint === undefined) {
                throw new RuntimeRevisionConflictError(
                    snapshot.investigation.id,
                    input.expectedRevision
                );
            }

            const [investigation] = await transaction
                .update(investigations)
                .set({
                    state: snapshot.investigation.state,
                    stateReason: snapshot.investigation.reason ?? null,
                    ...terminalTimestamps(snapshot, updatedAt),
                    updatedAt
                })
                .where(eq(investigations.id, snapshot.investigation.id))
                .returning({ id: investigations.id });
            if (investigation === undefined) {
                throw new Error(`Investigation ${snapshot.investigation.id} does not exist`);
            }
            await projectRuntimeSnapshot(transaction, canonicalSnapshot);
            return checkpointResult(canonicalSnapshot, checkpoint, appendedEvent);
        });
    }

    async load(investigationId: string): Promise<PersistedRuntime | undefined> {
        assertNonEmptyIdentifier(investigationId, "investigationId");
        const [record] = await this.#database.db
            .select({
                investigationId: investigations.id,
                task: investigations.input,
                workspacePath: investigations.workspacePath,
                snapshot: runtimeCheckpoints.snapshot,
                revision: runtimeCheckpoints.revision,
                lastEventSequence: runtimeCheckpoints.lastEventSequence,
                persistedAt: runtimeCheckpoints.persistedAt
            })
            .from(runtimeCheckpoints)
            .innerJoin(investigations, eq(investigations.id, runtimeCheckpoints.investigationId))
            .where(eq(runtimeCheckpoints.investigationId, investigationId))
            .limit(1);
        if (record === undefined) {
            return undefined;
        }
        return toPersistedRuntime(this.#database.db, record);
    }

    /**
     * Every investigation the lab holds, whatever state it settled in, most recently active first.
     * A settled run is listed as readily as a running one: the operator still has to see it, read
     * its report and decide whether to reopen it.
     */
    async listPersisted(limit = 100): Promise<PersistedRuntime[]> {
        assertPageSize(limit, RuntimePersistenceLimit.MAX_RECOVERABLE_INVESTIGATIONS);
        const records = await this.#database.db
            .select({
                investigationId: investigations.id,
                task: investigations.input,
                workspacePath: investigations.workspacePath,
                snapshot: runtimeCheckpoints.snapshot,
                revision: runtimeCheckpoints.revision,
                lastEventSequence: runtimeCheckpoints.lastEventSequence,
                persistedAt: runtimeCheckpoints.persistedAt
            })
            .from(runtimeCheckpoints)
            .innerJoin(investigations, eq(investigations.id, runtimeCheckpoints.investigationId))
            .orderBy(desc(runtimeCheckpoints.persistedAt))
            .limit(limit);

        const runtimes = await Promise.all(
            records.map(async (record) => {
                try {
                    return await toPersistedRuntime(this.#database.db, record);
                } catch (error) {
                    if (error instanceof IncompatibleCheckpointError) {
                        return undefined;
                    }
                    throw error;
                }
            })
        );
        return runtimes.filter((runtime): runtime is PersistedRuntime => runtime !== undefined);
    }

    /**
     * Rewrites what an investigation was asked to do. Only the operator's own instructions move —
     * the goal has to match the one the investigation was opened on, because a run that is chasing
     * something else is a different run and its history would no longer be about its goal.
     */
    async retask(investigationId: string, task: InvestigationInput): Promise<InvestigationInput> {
        assertNonEmptyIdentifier(investigationId, "investigationId");
        const parsed = InvestigationInputSchema.parse(task);
        const [record] = await this.#database.db
            .update(investigations)
            .set({ input: parsed, updatedAt: new Date() })
            .where(
                and(eq(investigations.id, investigationId), eq(investigations.goal, parsed.goal))
            )
            .returning({ input: investigations.input });
        if (record === undefined) {
            throw new Error(`Investigation ${investigationId} does not exist under that goal`);
        }
        return record.input;
    }

    async eventsAfter(
        investigationId: string,
        afterSequence: number = 0,
        limit: number = RuntimePersistenceLimit.DEFAULT_EVENT_PAGE
    ): Promise<PersistedInvestigationEvent[]> {
        assertNonEmptyIdentifier(investigationId, "investigationId");
        if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) {
            throw new RangeError("Event cursor must be a non-negative safe integer");
        }
        assertPageSize(limit, RuntimePersistenceLimit.MAX_EVENT_PAGE);
        const rows = await this.#database.db
            .select()
            .from(events)
            .where(
                and(eq(events.investigationId, investigationId), gt(events.sequence, afterSequence))
            )
            .orderBy(asc(events.sequence))
            .limit(limit);
        return rows.map(toPersistedEvent);
    }
}
