import { LabState } from "@lab/protocol/constants";
import type { Evidence, LabEvent, TaskInput } from "@lab/protocol/schemas";
import { EvidenceSchema, LabEventSchema, TaskInputSchema } from "@lab/protocol/schemas";
import type { StatusSnapshot } from "@lab/protocol/status";
import { StatusSnapshotSchema } from "@lab/protocol/status";
import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Database } from "#src/client";
import { projectRuntimeSnapshot } from "#src/runtime-projection";
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
    readonly evidence: Evidence[];
    readonly revision: number;
    readonly lastEventSequence?: number;
}

export interface PersistedRuntime {
    readonly task: TaskInput;
    readonly workspacePath: string;
    readonly checkpoint: RuntimeCheckpoint;
    readonly persistedAt: string;
}

export type RecoverableRuntime = PersistedRuntime;

export interface InitializeRuntimeInput {
    readonly task: TaskInput;
    readonly workspacePath: string;
    readonly snapshot: StatusSnapshot;
    readonly evidence?: readonly Evidence[];
    readonly event?: LabEvent;
}

export interface CommitRuntimeInput {
    readonly snapshot: StatusSnapshot;
    readonly evidence?: readonly Evidence[];
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
        const evidenceRecords = parseEvidence(input.evidence);
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
                    evidence: evidenceRecords,
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
            await projectRuntimeSnapshot(transaction, canonicalSnapshot, evidenceRecords);
            return checkpointResult(canonicalSnapshot, evidenceRecords, checkpoint, appendedEvent);
        });
    }

    async commit(input: CommitRuntimeInput): Promise<CommitRuntimeResult> {
        assertRevision(input.expectedRevision);
        const snapshot = StatusSnapshotSchema.parse(input.snapshot);
        const event = parseEvent(input.event, snapshot.lab.id);

        return this.#database.transaction(async (transaction) => {
            const evidenceRecords =
                input.evidence === undefined
                    ? await loadCheckpointEvidence(transaction, snapshot.lab.id)
                    : parseEvidence(input.evidence);
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
                    evidence: evidenceRecords,
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
            await projectRuntimeSnapshot(transaction, canonicalSnapshot, evidenceRecords);
            return checkpointResult(canonicalSnapshot, evidenceRecords, checkpoint, appendedEvent);
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
                evidence: runtimeCheckpoints.evidence,
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
                evidence: runtimeCheckpoints.evidence,
                revision: runtimeCheckpoints.revision,
                lastEventSequence: runtimeCheckpoints.lastEventSequence,
                persistedAt: runtimeCheckpoints.persistedAt
            })
            .from(runtimeCheckpoints)
            .innerJoin(labs, eq(labs.id, runtimeCheckpoints.labId))
            .where(inArray(labs.state, [LabState.RUNNING, LabState.HIBERNATING]))
            .orderBy(desc(runtimeCheckpoints.persistedAt))
            .limit(limit);

        return Promise.all(
            records.map(async (record) => {
                return toPersistedRuntime(this.#database, record);
            })
        );
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

type RuntimeDatabase = Pick<Database, "select">;
type EventInsertDatabase = Pick<Database, "insert">;

interface PersistedRuntimeRecord {
    readonly labId: string;
    readonly task: TaskInput;
    readonly workspacePath: string;
    readonly snapshot: StatusSnapshot;
    readonly evidence: Evidence[];
    readonly revision: number;
    readonly lastEventSequence: number | null;
    readonly persistedAt: Date;
}

async function toPersistedRuntime(
    database: RuntimeDatabase,
    record: PersistedRuntimeRecord
): Promise<PersistedRuntime> {
    const task = TaskInputSchema.parse(record.task);
    const snapshot = StatusSnapshotSchema.parse(record.snapshot);
    const evidenceRecords = parseEvidence(record.evidence);
    assertRuntimeMetadata(record.labId, task, record.workspacePath, snapshot);
    return {
        task,
        workspacePath: record.workspacePath,
        checkpoint: checkpointResult(
            await withRecentEvents(database, snapshot, RuntimePersistenceLimit.DEFAULT_EVENT_PAGE),
            evidenceRecords,
            record
        ),
        persistedAt: record.persistedAt.toISOString()
    };
}

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

async function loadCheckpointEvidence(
    database: RuntimeDatabase,
    labId: string
): Promise<Evidence[]> {
    const [checkpoint] = await database
        .select({ evidence: runtimeCheckpoints.evidence })
        .from(runtimeCheckpoints)
        .where(eq(runtimeCheckpoints.labId, labId))
        .limit(1);
    return parseEvidence(checkpoint?.evidence);
}

async function insertEvent(
    database: EventInsertDatabase,
    event: LabEvent
): Promise<PersistedLabEvent> {
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
    evidenceRecords: Evidence[],
    checkpoint: { readonly revision: number; readonly lastEventSequence: number | null },
    appendedEvent?: PersistedLabEvent
): CommitRuntimeResult {
    return {
        snapshot,
        evidence: evidenceRecords,
        revision: checkpoint.revision,
        ...(checkpoint.lastEventSequence === null
            ? {}
            : { lastEventSequence: checkpoint.lastEventSequence }),
        ...(appendedEvent === undefined ? {} : { appendedEvent })
    };
}

function parseEvidence(value: readonly Evidence[] | undefined): Evidence[] {
    return EvidenceSchema.array().parse(value ?? []);
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

function assertRuntimeMetadata(
    labId: string,
    task: TaskInput,
    workspacePath: string,
    snapshot: StatusSnapshot
): void {
    assertNonEmptyWorkspacePath(workspacePath);
    if (snapshot.lab.id !== labId) {
        throw new Error(`Runtime checkpoint lab id does not match lab record ${labId}`);
    }
    if (snapshot.lab.goal !== task.goal) {
        throw new Error(`Runtime checkpoint goal does not match task input for ${labId}`);
    }
}

function assertNonEmptyIdentifier(value: string, field: string): void {
    if (value.trim().length === 0) {
        throw new Error(`${field} must not be empty`);
    }
}
