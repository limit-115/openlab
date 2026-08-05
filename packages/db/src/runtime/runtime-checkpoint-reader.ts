import { InvestigationInputSchema } from "@nightlab/protocol/investigation-input/investigation-input.schema";
import type { InvestigationInput } from "@nightlab/protocol/investigation-input/investigation-input.types";
import { StatusSnapshotSchema } from "@nightlab/protocol/investigation-status/status-snapshot.schema";
import type { StatusSnapshot } from "@nightlab/protocol/investigation-status/status-snapshot.types";
import { desc, eq } from "drizzle-orm";
import type { Database } from "#src/lab-database/lab-database-client";
import { events } from "#src/lab-database/lab-schema";
import { IncompatibleCheckpointError } from "#src/runtime/incompatible-checkpoint";
import { toInvestigationEvent } from "#src/runtime/runtime-event-log";
import { assertRuntimeMetadata } from "#src/runtime/runtime-metadata-validation";
import { RuntimePersistenceLimit } from "#src/runtime/runtime-persistence.const";
import type {
    CommitRuntimeResult,
    PersistedInvestigationEvent,
    PersistedRuntime
} from "#src/runtime/runtime-persistence.types";

type RuntimeDatabase = Pick<Database, "select">;

export interface PersistedRuntimeRecord {
    readonly investigationId: string;
    readonly task: InvestigationInput;
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
    assertRuntimeMetadata(record.investigationId, task, record.workspacePath, snapshot);
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
    task: InvestigationInput;
    snapshot: StatusSnapshot;
} {
    try {
        return {
            task: InvestigationInputSchema.parse(record.task),
            snapshot: StatusSnapshotSchema.parse(record.snapshot)
        };
    } catch (error) {
        throw new IncompatibleCheckpointError(record.investigationId, { cause: error });
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
        .where(eq(events.investigationId, snapshot.investigation.id))
        .orderBy(desc(events.sequence))
        .limit(limit);
    return StatusSnapshotSchema.parse({
        ...snapshot,
        recent_events: rows.reverse().map(toInvestigationEvent)
    });
}

export function checkpointResult(
    snapshot: StatusSnapshot,
    checkpoint: { readonly revision: number; readonly lastEventSequence: number | null },
    appendedEvent?: PersistedInvestigationEvent
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
