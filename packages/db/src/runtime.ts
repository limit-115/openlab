import { LabState } from "@lab/protocol/constants";
import type { LabEvent, TaskInput } from "@lab/protocol/schemas";
import { LabEventSchema, TaskInputSchema } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { StatusSnapshotSchema } from "@lab/protocol/status";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Database } from "#src/client";
import { events, labs, runtimeCheckpoints } from "#src/schema";

const RuntimePersistenceLimit = {
    DEFAULT_EVENT_PAGE: 200,
    MAX_EVENT_PAGE: 1_000,
    MAX_RECOVERABLE_LABS: 1_000
} as const;

export interface PersistedLabEvent extends LabEvent {
    readonly sequence: number;
}

export interface RuntimeCheckpoint {
    readonly snapshot: StatusSnapshot;
    readonly revision: number;
    readonly lastEventSequence?: number;
}

export interface InitializeRuntimeInput {
    readonly task: TaskInput;
    readonly workspacePath: string;
    readonly snapshot: StatusSnapshot;
    readonly event?: LabEvent;
}

export interface CommitRuntimeInput {
    readonly snapshot: StatusSnapshot;
    readonly expectedRevision: number;
    readonly event?: LabEvent;
}

export interface CommitRuntimeResult extends RuntimeCheckpoint {
    readonly appendedEvent?: PersistedLabEvent;
}

export class RuntimeRevisionConflictError extends Error {
    readonly labId: string;
    readonly expectedRevision: number;

    constructor(labId: string, expectedRevision: number) {
        super(`Lab ${labId} is no longer at runtime revision ${expectedRevision}`);
        this.name = "RuntimeRevisionConflictError";
        this.labId = labId;
        this.expectedRevision = expectedRevision;
    }
}

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
            return checkpointResult(canonicalSnapshot, checkpoint, appendedEvent);
        });
    }

    async load(labId: string): Promise<RuntimeCheckpoint | undefined> {
        assertNonEmptyIdentifier(labId, "labId");
        const checkpoint = await this.#database.query.runtimeCheckpoints.findFirst({
            where: eq(runtimeCheckpoints.labId, labId)
        });
        if (checkpoint === undefined) {
            return undefined;
        }
        const snapshot = StatusSnapshotSchema.parse(checkpoint.snapshot);
        const canonicalSnapshot = await withRecentEvents(
            this.#database,
            snapshot,
            RuntimePersistenceLimit.DEFAULT_EVENT_PAGE
        );
        return checkpointResult(canonicalSnapshot, checkpoint);
    }

    async listRecoverable(limit = 100): Promise<RuntimeCheckpoint[]> {
        assertPageSize(limit, RuntimePersistenceLimit.MAX_RECOVERABLE_LABS);
        const records = await this.#database
            .select({
                snapshot: runtimeCheckpoints.snapshot,
                revision: runtimeCheckpoints.revision,
                lastEventSequence: runtimeCheckpoints.lastEventSequence
            })
            .from(runtimeCheckpoints)
            .innerJoin(labs, eq(labs.id, runtimeCheckpoints.labId))
            .where(inArray(labs.state, [LabState.RUNNING, LabState.HIBERNATING]))
            .orderBy(desc(runtimeCheckpoints.persistedAt))
            .limit(limit);

        return Promise.all(
            records.map(async (record) => {
                const snapshot = StatusSnapshotSchema.parse(record.snapshot);
                return checkpointResult(
                    await withRecentEvents(
                        this.#database,
                        snapshot,
                        RuntimePersistenceLimit.DEFAULT_EVENT_PAGE
                    ),
                    record
                );
            })
        );
    }

    async eventsAfter(
        labId: string,
        afterSequence = 0,
        limit = RuntimePersistenceLimit.DEFAULT_EVENT_PAGE
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

type RuntimeDatabase = Pick<Database, "select">;

async function withRecentEvents(
    database: RuntimeDatabase,
    snapshot: StatusSnapshot,
    limit: number
): Promise<StatusSnapshot> {
    const rows = await database
        .select()
        .from(events)
        .where(eq(events.labId, snapshot.lab.id))
        .orderBy(desc(events.sequence))
        .limit(limit);
    return StatusSnapshotSchema.parse({
        ...snapshot,
        recent_events: rows.reverse().map(toLabEvent)
    });
}

async function insertEvent(database: Database, event: LabEvent): Promise<PersistedLabEvent> {
    const [record] = await database
        .insert(events)
        .values({
            id: event.id,
            labId: event.lab_id,
            type: event.type,
            payload: event.payload,
            occurredAt: parseTimestamp(event.occurred_at, "event.occurred_at")
        })
        .returning();
    if (record === undefined) {
        throw new Error(`Failed to append event ${event.id}`);
    }
    return toPersistedEvent(record);
}

function parseEvent(event: LabEvent | undefined, labId: string): LabEvent | undefined {
    if (event === undefined) {
        return undefined;
    }
    const parsed = LabEventSchema.parse(event);
    if (parsed.lab_id !== labId) {
        throw new Error(`Event ${parsed.id} belongs to another lab`);
    }
    return parsed;
}

function checkpointResult(
    snapshot: StatusSnapshot,
    checkpoint: { readonly revision: number; readonly lastEventSequence: number | null },
    appendedEvent?: PersistedLabEvent
): CommitRuntimeResult {
    return {
        snapshot,
        revision: checkpoint.revision,
        ...(checkpoint.lastEventSequence === null
            ? {}
            : { lastEventSequence: checkpoint.lastEventSequence }),
        ...(appendedEvent === undefined ? {} : { appendedEvent })
    };
}

function terminalTimestamps(snapshot: StatusSnapshot, updatedAt: Date) {
    switch (snapshot.lab.state) {
        case LabState.HIBERNATING:
            return { hibernatedAt: updatedAt };
        case LabState.COMPLETED:
            return { completedAt: updatedAt };
        case LabState.STOPPED:
            return { stoppedAt: updatedAt };
        case LabState.RUNNING:
        case LabState.FAILED:
            return {};
    }
}

function toPersistedEvent(record: typeof events.$inferSelect): PersistedLabEvent {
    return {
        sequence: record.sequence,
        ...toLabEvent(record)
    };
}

function toLabEvent(record: typeof events.$inferSelect): LabEvent {
    return LabEventSchema.parse({
        id: record.id,
        lab_id: record.labId,
        type: record.type,
        occurred_at: record.occurredAt.toISOString(),
        payload: record.payload
    });
}

function parseTimestamp(value: string, field: string): Date {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
        throw new Error(`${field} must be a valid timestamp`);
    }
    return timestamp;
}

function assertRevision(revision: number): void {
    if (!Number.isSafeInteger(revision) || revision < 1) {
        throw new RangeError("Runtime revision must be a positive safe integer");
    }
}

function assertPageSize(limit: number, maximum: number): void {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > maximum) {
        throw new RangeError(`Page size must be between 1 and ${maximum}`);
    }
}

function assertNonEmptyWorkspacePath(workspacePath: string): void {
    if (workspacePath.trim().length === 0) {
        throw new Error("Workspace path must not be empty");
    }
}

function assertNonEmptyIdentifier(value: string, field: string): void {
    if (value.trim().length === 0) {
        throw new Error(`${field} must not be empty`);
    }
}
