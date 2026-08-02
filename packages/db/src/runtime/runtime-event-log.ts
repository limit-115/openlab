import { LabEventSchema } from "@lab/protocol/lab-events/lab-event.schema";
import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import type { Database } from "#src/lab-database/lab-database-client";
import { events } from "#src/lab-database/lab-schema";
import { parseTimestamp } from "#src/runtime/runtime-metadata-validation";
import type { PersistedLabEvent } from "#src/runtime/runtime-persistence.types";

type EventInsertDatabase = Pick<Database, "insert">;

export async function insertEvent(
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

export function parseEvent(event: LabEvent | undefined, labId: string): LabEvent | undefined {
    if (event === undefined) {
        return undefined;
    }
    const parsed = LabEventSchema.parse(event);
    if (parsed.lab_id !== labId) {
        throw new Error(`Event ${parsed.id} belongs to another lab`);
    }
    return parsed;
}

export function toPersistedEvent(record: typeof events.$inferSelect): PersistedLabEvent {
    return {
        sequence: record.sequence,
        ...toLabEvent(record)
    };
}

export function toLabEvent(record: typeof events.$inferSelect): LabEvent {
    return LabEventSchema.parse({
        id: record.id,
        lab_id: record.labId,
        type: record.type,
        occurred_at: record.occurredAt.toISOString(),
        payload: record.payload
    });
}
