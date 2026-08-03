import { describe, expect, it } from "vitest";
import {
    CapabilityRequestType,
    CapabilityStatus
} from "#src/capabilities/capability-request.const";
import { CapabilityRequestSchema } from "#src/capabilities/capability-request.schema";

const openRequest = {
    id: "capability-dataset",
    type: CapabilityRequestType.CAPABILITY_REQUEST,
    need: "Independent dataset",
    reason: "The verifier needs independent observations",
    provisioning_hint: "Mount the dataset in the lab workspace",
    self_provisioning_attempt: "Reconstructed the corpus from public mirrors and came up short",
    created_at: "2026-08-02T09:00:00.000Z"
} as const;

describe("CapabilityRequestSchema", () => {
    it("carries an operator refusal as the answer rather than losing it", () => {
        const capability = CapabilityRequestSchema.parse({
            ...openRequest,
            status: CapabilityStatus.ANSWERED,
            answer: "Not giving you this one, reconstruct it from the public mirrors yourself",
            answered_at: "2026-08-02T10:00:00.000Z"
        });

        expect(capability.answer).toBe(
            "Not giving you this one, reconstruct it from the public mirrors yourself"
        );
    });

    it("rejects an answered request that records no answer", () => {
        expect(() =>
            CapabilityRequestSchema.parse({
                ...openRequest,
                status: CapabilityStatus.ANSWERED,
                answered_at: "2026-08-02T10:00:00.000Z"
            })
        ).toThrow("requires the operator answer and its timestamp");
    });

    it("leaves a fresh request open and non-blocking", () => {
        const capability = CapabilityRequestSchema.parse(openRequest);

        expect(capability.status).toBe(CapabilityStatus.OPEN);
        expect(capability.blocking).toBe(false);
    });

    it("accepts a daemon-raised request that attempted no provisioning of its own", () => {
        const { self_provisioning_attempt: _omitted, ...daemonRaised } = openRequest;

        const capability = CapabilityRequestSchema.parse(daemonRaised);

        expect(capability.self_provisioning_attempt).toBeUndefined();
    });
});
