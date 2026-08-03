import { StatusSnapshotSchema } from "@lab/protocol/lab-status/status-snapshot.schema";
import type { StatusSnapshot } from "@lab/protocol/lab-status/status-snapshot.types";
import { TaskInputSchema } from "@lab/protocol/research-task/task-input.schema";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import { desc, eq } from "drizzle-orm";
import type { Database } from "#src/lab-database/lab-database-client";
import { events } from "#src/lab-database/lab-schema";
import { IncompatibleCheckpointError } from "#src/runtime/incompatible-checkpoint";
import { toLabEvent } from "#src/runtime/runtime-event-log";
import { assertRuntimeMetadata } from "#src/runtime/runtime-metadata-validation";
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
    readonly revision: number;
    readonly lastEventSequence: number | null;
    readonly persistedAt: Date;
}

export async function toPersistedRuntime(
    database: RuntimeDatabase,
    record: PersistedRuntimeRecord
): Promise<PersistedRuntime> {
    const { task, snapshot } = readCheckpointContract(record);
    assertRuntimeMetadata(record.labId, task, record.workspacePath, snapshot);
    return {
        task,
        workspacePath: record.workspacePath,
        checkpoint: checkpointResult(
            await withRecentEvents(database, snapshot, RuntimePersistenceLimit.DEFAULT_EVENT_PAGE),
            record
        ),
        persistedAt: record.persistedAt.toISOString()
    };
}

/**
 * Contract state written by an older build parses into nothing this process can act on. It is
 * reported as an incompatible checkpoint so a caller can decline to resume it, while genuine
 * corruption keeps failing through the metadata assertions.
 */
function readCheckpointContract(record: PersistedRuntimeRecord): {
    task: TaskInput;
    snapshot: StatusSnapshot;
} {
    try {
        return {
            task: TaskInputSchema.parse(record.task),
            snapshot: StatusSnapshotSchema.parse(record.snapshot)
        };
    } catch (error) {
        throw new IncompatibleCheckpointError(record.labId, { cause: error });
    }
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

export function checkpointResult(
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
