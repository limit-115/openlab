import type { LabEvent } from "@lab/protocol/lab-events/lab-event.types";
import { and, desc, eq, lt } from "drizzle-orm";
import { EventPageSize } from "#src/events/event-repository.const";
import type { AppendEventInput } from "#src/events/event-repository.types";
import type { Database } from "#src/lab-database/lab-database-client";
import { events } from "#src/lab-database/lab-schema";

export class EventRepository {
    readonly #database: Database;

    constructor(database: Database) {
        this.#database = database;
    }

    async append(input: AppendEventInput): Promise<number> {
        const [event] = await this.#database
            .insert(events)
            .values({
                id: input.id,
                labId: input.labId,
                type: input.type,
                payload: { ...input.payload },
                occurredAt: input.occurredAt ?? new Date()
            })
            .returning({ sequence: events.sequence });
        if (event === undefined) {
            throw new Error(`Failed to append event ${input.id}`);
        }
        return event.sequence;
    }

    async recent(labId: string, limit: number, beforeSequence?: number): Promise<LabEvent[]> {
        if (
            !Number.isSafeInteger(limit) ||
            limit < EventPageSize.MINIMUM ||
            limit > EventPageSize.MAXIMUM
        ) {
            throw new RangeError("Event page size must be between 1 and 1000");
        }
        const rows = await this.#database
            .select()
            .from(events)
            .where(
                beforeSequence === undefined
                    ? eq(events.labId, labId)
                    : and(eq(events.labId, labId), lt(events.sequence, beforeSequence))
            )
            .orderBy(desc(events.sequence))
            .limit(limit);
        return rows.map((event) => ({
            id: event.id,
            lab_id: event.labId,
            type: event.type,
            occurred_at: event.occurredAt.toISOString(),
            payload: event.payload
        }));
    }
}
