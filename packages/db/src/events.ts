import type { EventType } from "@lab/protocol/constants";
import type { LabEvent } from "@lab/protocol/schemas";
import { and, desc, eq, lt } from "drizzle-orm";
import type { Database } from "#src/client";
import { events } from "#src/schema";

export interface AppendEventInput {
    readonly id: string;
    readonly labId: string;
    readonly type: EventType;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly occurredAt?: Date;
}

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
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
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
