import { describe, expect, it } from "vitest";
import { evaluateDormantCapabilityDirection } from "#src/research-contract/director-direction-policy";
import {
    DormantCapabilityPolicyDecision,
    DormantCapabilityPolicyReason
} from "#src/research-contract/director-direction-policy.const";

const ProtectedDirection = {
    title: "Repair orchestration recovery",
    approach: "Rewrite the research lab orchestrator recovery path",
    rationale: "Changing the control plane could alter how future work is dispatched",
    objective: "Patch the research-loop scheduler"
} as const;

describe("dormant Director direction policy", () => {
    it("denies protected control-plane mutation without a recovered diagnosed blocker", () => {
        expect(
            evaluateDormantCapabilityDirection(ProtectedDirection, {
                recovered: false,
                frontierBlockers: [
                    "The research lab orchestrator crashes while restoring queued tasks"
                ]
            })
        ).toEqual({
            decision: DormantCapabilityPolicyDecision.DENY,
            reason: DormantCapabilityPolicyReason.UNDIAGNOSED_CONTROL_PLANE_MUTATION
        });
    });

    it("allows the dormant repair capability for a matching recovered blocker", () => {
        expect(
            evaluateDormantCapabilityDirection(ProtectedDirection, {
                recovered: true,
                frontierBlockers: [
                    "The research lab orchestrator crashes while restoring queued tasks"
                ]
            })
        ).toEqual({ decision: DormantCapabilityPolicyDecision.ALLOW });
    });

    it("does not treat ordinary mission software refactoring as a protected mutation", () => {
        expect(
            evaluateDormantCapabilityDirection(
                {
                    title: "Refactor checkout workflow",
                    approach: "Replace the customer-order orchestrator with a durable queue",
                    rationale: "The application loses checkout events during traffic spikes",
                    objective: "Measure order completion after the software refactor"
                },
                { recovered: false, frontierBlockers: [] }
            )
        ).toEqual({ decision: DormantCapabilityPolicyDecision.ALLOW });
    });
});
