import { describe, expect, it } from "vitest";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "#src/capabilities/capability-request.const";
import { CapabilityRequestSchema } from "#src/capabilities/capability-request.schema";

describe("CapabilityRequestSchema", () => {
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
