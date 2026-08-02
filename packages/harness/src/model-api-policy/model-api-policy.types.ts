import type { ModelApiPolicyDecision } from "#src/model-api-policy/model-api-policy.const";

export interface ModelApiPolicyResult {
    readonly decision: ModelApiPolicyDecision;
    readonly reason?: string;
}
