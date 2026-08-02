import { describe, expect, it } from "vitest";
import { CapabilityRequestType, CapabilityStatus, LabState } from "#src/constants";
import { CapabilityRequestSchema } from "#src/schemas";
import { ProvideCapabilitySchema, StatusSnapshotSchema } from "#src/status";

describe("StatusSnapshotSchema", () => {
    it("applies empty collection defaults", () => {
        const now = new Date().toISOString();
        const status = StatusSnapshotSchema.parse({
            lab: {
                id: "lab-1",
                state: LabState.RUNNING,
                goal: "Prove a claim",
                started_at: now,
                updated_at: now,
                uptime_ms: 1
            },
            frontier: {
                updated_at: now
            }
        });

        expect(status.branches).toEqual([]);
        expect(status.frontier.open_questions).toEqual([]);
    });

    it("preserves a provided capability resource as protocol state", () => {
        const providedAt = "2026-08-02T10:00:00.000Z";

        const capability = CapabilityRequestSchema.parse({
            id: "capability-dataset",
            type: CapabilityRequestType.CAPABILITY_REQUEST,
            need: "Independent dataset",
            reason: "The verifier needs independent observations",
            provisioning_hint: "Mount the dataset in the lab workspace",
            status: CapabilityStatus.PROVIDED,
            resource_reference: "dataset://independent/v1",
            provided_at: providedAt,
            created_at: "2026-08-02T09:00:00.000Z"
        });

        expect(capability).toMatchObject({
            status: CapabilityStatus.PROVIDED,
            resource_reference: "dataset://independent/v1",
            provided_at: providedAt
        });
    });

    it("rejects a provided capability without operational resource state", () => {
        expect(() =>
            CapabilityRequestSchema.parse({
                id: "capability-dataset",
                type: CapabilityRequestType.CAPABILITY_REQUEST,
                need: "Independent dataset",
                reason: "The verifier needs independent observations",
                provisioning_hint: "Mount the dataset in the lab workspace",
                status: CapabilityStatus.PROVIDED,
                created_at: "2026-08-02T09:00:00.000Z"
            })
        ).toThrow("requires its resource reference and timestamp");
    });
});

describe("ProvideCapabilitySchema", () => {
    it("accepts an opaque resource handle", () => {
        expect(
            ProvideCapabilitySchema.parse({
                resource_reference: " keychain://ai-research-lab/licensed-corpus "
            })
        ).toEqual({
            resource_reference: "keychain://ai-research-lab/licensed-corpus"
        });
    });

    it.each([
        "sk-proj-abcdefghijklmnopqrstuvwxyz012345",
        "Bearer abcdefghijklmnopqrstuvwxyz012345",
        "a".repeat(96),
        "api-key: abcdefghijklmnopqrstuvwxyz"
    ])("rejects credential material instead of accepting %s", (resourceReference) => {
        expect(() =>
            ProvideCapabilitySchema.parse({ resource_reference: resourceReference })
        ).toThrow();
    });
});
