export interface PromotionDecision {
    readonly allowed: boolean;
    readonly reasons: readonly string[];
    readonly supportingEvidenceIds: readonly string[];
    readonly contradictingEvidenceIds: readonly string[];
}
