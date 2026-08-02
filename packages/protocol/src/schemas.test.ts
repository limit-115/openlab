import { describe, expect, it } from "vitest";
import { ClaimStatus, EventType } from "#src/constants";
import {
    CapabilityResourceReferenceSchema,
    ClaimSchema,
    LabEventSchema,
    TaskInputSchema
} from "#src/schemas";

const SafeCapabilityReference = {
    DATASET: "dataset://independent/v1",
    TOOLCHAIN: "toolchain://node/24",
    KEYCHAIN: "keychain://ai-research-lab/github",
    FILE: "file:///tmp/research-dataset.csv"
} as const;

const UnsafeCapabilityReference = {
    OPENAI_KEY: "sk-proj-abcdefghijklmnopqrstuvwxyz012345",
    BEARER_TOKEN: "Bearer abcdefghijklmnopqrstuvwxyz012345",
    LONG_TOKEN: "a".repeat(96),
    API_KEY_PLAINTEXT: "api-key: abcdefghijklmnopqrstuvwxyz",
    ARBITRARY_PLAINTEXT: "/tmp/research-dataset.csv",
    NETWORK_URL: "https://example.com/dataset.csv",
    EMBEDDED_SECRET: "keychain://ai-research-lab/sk-proj-abcdefghijklmnopqrstuvwxyz012345"
} as const;

describe("CapabilityResourceReferenceSchema", () => {
    it("accepts only explicit opaque resource schemes", () => {
        for (const reference of Object.values(SafeCapabilityReference)) {
            expect(CapabilityResourceReferenceSchema.parse(` ${reference} `)).toBe(reference);
        }
    });

    it("rejects raw secrets and arbitrary plaintext", () => {
        for (const reference of Object.values(UnsafeCapabilityReference)) {
            expect(() => CapabilityResourceReferenceSchema.parse(reference)).toThrow();
        }
    });

    it("rejects credential material hidden behind an allowed scheme", () => {
        expect(() =>
            CapabilityResourceReferenceSchema.parse("dataset://user:password@independent/v1")
        ).toThrow("credential payload");
        expect(() =>
            CapabilityResourceReferenceSchema.parse("dataset://independent/v1?api_key=secret")
        ).toThrow("credential payload");
    });
});

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
