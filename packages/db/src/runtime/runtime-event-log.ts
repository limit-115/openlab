import { InvestigationEventSchema } from "@nightlab/protocol/investigation-events/investigation-event.schema";
import type { InvestigationEvent } from "@nightlab/protocol/investigation-events/investigation-event.types";
import type { Database } from "#src/lab-database/lab-database-client";
import { events } from "#src/lab-database/lab-schema";
import { parseTimestamp } from "#src/runtime/runtime-metadata-validation";
import type { PersistedInvestigationEvent } from "#src/runtime/runtime-persistence.types";

type EventInsertDatabase = Pick<Database, "insert">;

export async function insertEvent(
    database: EventInsertDatabase,
    event: InvestigationEvent
): Promise<PersistedInvestigationEvent> {
    const [record] = await database
        .insert(events)
        .values({
            id: event.id,
            investigationId: event.investigation_id,
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

export function parseEvent(
    event: InvestigationEvent | undefined,
    investigationId: string
): InvestigationEvent | undefined {
    if (event === undefined) {
        return undefined;
    }
    const parsed = InvestigationEventSchema.parse(event);
    if (parsed.investigation_id !== investigationId) {
        throw new Error(`Event ${parsed.id} belongs to another investigation`);
    }
    return parsed;
}

export function toPersistedEvent(record: typeof events.$inferSelect): PersistedInvestigationEvent {
    return {
        sequence: record.sequence,
        ...toInvestigationEvent(record)
    };
}

export function toInvestigationEvent(record: typeof events.$inferSelect): InvestigationEvent {
    return InvestigationEventSchema.parse({
        id: record.id,
        investigation_id: record.investigationId,
        type: record.type,
        occurred_at: record.occurredAt.toISOString(),
        payload: record.payload
    });
}
