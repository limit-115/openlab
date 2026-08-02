import type {
    DormantCapabilityPolicyDecision,
    DormantCapabilityPolicyReason
} from "#src/research-contract/director-direction-policy.const";

export interface DirectorDirectionCandidate {
    readonly title: string;
    readonly approach: string;
    readonly rationale: string;
    readonly objective: string;
}

export interface DormantCapabilityPolicyContext {
    readonly recovered: boolean;
    readonly frontierBlockers: readonly string[];
}

export type DormantCapabilityPolicyResult =
    | { readonly decision: typeof DormantCapabilityPolicyDecision.ALLOW }
    | {
          readonly decision: typeof DormantCapabilityPolicyDecision.DENY;
          readonly reason: (typeof DormantCapabilityPolicyReason)[keyof typeof DormantCapabilityPolicyReason];
      };
