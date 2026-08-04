import { describe, expect, it } from "vitest";
import { EventType } from "#src/lab-events/event-type.const";
import { LabEventSchema } from "#src/lab-events/lab-event.schema";

describe("LabEventSchema", () => {
    it("accepts known event types and rejects arbitrary identifiers", () => {
        const event = {
            id: "event-1",
            lab_id: "lab-1",
            type: EventType.LAB_STARTED,
            occurred_at: new Date().toISOString(),
            payload: {}
        };

        expect(LabEventSchema.parse(event).type).toBe(EventType.LAB_STARTED);
        expect(() => LabEventSchema.parse({ ...event, type: "unknown.event" })).toThrow();
    });
});
