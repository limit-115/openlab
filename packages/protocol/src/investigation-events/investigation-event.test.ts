import { describe, expect, it } from "vitest";
import { EventType } from "#src/investigation-events/event-type.const";
import { InvestigationEventSchema } from "#src/investigation-events/investigation-event.schema";

describe("InvestigationEventSchema", () => {
    it("accepts known event types and rejects arbitrary identifiers", () => {
        const event = {
            id: "event-1",
            investigation_id: "investigation-1",
            type: EventType.INVESTIGATION_STARTED,
            occurred_at: new Date().toISOString(),
            payload: {}
        };

        expect(InvestigationEventSchema.parse(event).type).toBe(EventType.INVESTIGATION_STARTED);
        expect(() => InvestigationEventSchema.parse({ ...event, type: "unknown.event" })).toThrow();
    });
});
