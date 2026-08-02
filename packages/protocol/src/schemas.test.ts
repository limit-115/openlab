import { describe, expect, it } from "vitest";
import { ClaimStatus, EventType } from "#src/constants";
import { ClaimSchema, LabEventSchema, TaskInputSchema } from "#src/schemas";

describe("TaskInputSchema", () => {
    it("accepts a goal and supplies optional collection defaults", () => {
        expect(TaskInputSchema.parse({ goal: "Find a faster algorithm" })).toEqual({
            goal: "Find a faster algorithm",
            context: [],
            success_criteria: []
        });
    });

    it("rejects an empty goal", () => {
        expect(() => TaskInputSchema.parse({ goal: "  " })).toThrow();
    });
});

describe("ClaimSchema", () => {
    it("does not infer supporting evidence", () => {
        const now = new Date().toISOString();
        const claim = ClaimSchema.parse({
            id: "claim-1",
            branch_id: "branch-1",
            statement: "The candidate is faster",
            status: ClaimStatus.PROPOSED,
            created_at: now,
            updated_at: now
        });

        expect(claim.supporting_evidence_ids).toEqual([]);
        expect(claim.contradicting_evidence_ids).toEqual([]);
    });
});

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
