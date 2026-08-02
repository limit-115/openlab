import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { StatusSnapshotSchema } from "@lab/protocol/lab-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { TaskInputSchema } from "@lab/protocol/research-task/task-input.schema";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import { desc, eq } from "drizzle-orm";
import type { Database } from "#src/lab-database/lab-database-client";
import { events, runtimeCheckpoints } from "#src/lab-database/lab-schema";
import { toLabEvent } from "#src/runtime/runtime-event-log";
import { assertRuntimeMetadata, parseEvidence } from "#src/runtime/runtime-metadata-validation";
import { RuntimePersistenceLimit } from "#src/runtime/runtime-persistence.const";
import type {
    CommitRuntimeResult,
    PersistedLabEvent,
    PersistedRuntime
} from "#src/runtime/runtime-persistence.types";

type RuntimeDatabase = Pick<Database, "select">;

export interface PersistedRuntimeRecord {
    readonly labId: string;
    readonly task: TaskInput;
    readonly workspacePath: string;
    readonly snapshot: StatusSnapshot;
    readonly evidence: Evidence[];
    readonly revision: number;
    readonly lastEventSequence: number | null;
    readonly persistedAt: Date;
}

export async function toPersistedRuntime(
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

export async function withRecentEvents(
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

export async function loadCheckpointEvidence(
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

export function checkpointResult(
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
