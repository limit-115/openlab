import type { Claim } from "@lab/protocol/claims/claim.types";
import {
    ClaimStatus,
    type ClaimStatus as ClaimStatusValue
} from "@lab/protocol/claims/claim-status.const";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import {
    deduplicateEvidence,
    isContradictingEvidence,
    isSupportingEvidence,
    isUsableEvidence
} from "#src/claims/claim-evidence";
import type { AssessedEvidence } from "#src/claims/claim-evidence.types";
import { legalClaimTransitions } from "#src/claims/claim-promotion.const";
import type { PromotionDecision } from "#src/claims/claim-promotion.types";
import { EvidenceOrigin } from "#src/claims/evidence-origin.const";

export function assessClaimPromotion(
    claim: Claim,
    target: ClaimStatusValue,
    suppliedEvidence: readonly AssessedEvidence[]
): PromotionDecision {
    const reasons: string[] = [];
    const evidence = deduplicateEvidence(suppliedEvidence).filter((candidate) =>
        isUsableEvidence(candidate)
    );
    const supporting = evidence.filter(isSupportingEvidence);
    const contradicting = evidence.filter(isContradictingEvidence);

    if (claim.stale && target !== ClaimStatus.TESTING) {
        reasons.push("A stale claim must be retested before promotion");
    }

    if (!legalClaimTransitions[claim.status].has(target)) {
        reasons.push(`Illegal claim transition: ${claim.status} -> ${target}`);
    }

    if (target === ClaimStatus.SUPPORTED || target === ClaimStatus.REPRODUCED) {
        const materialSupport = supporting.filter(
            ({ origin }) => origin !== EvidenceOrigin.MODEL_JUDGEMENT
        );
        if (materialSupport.length === 0) {
            reasons.push("Model judgement alone cannot support a claim");
        }
    }

    if (target === ClaimStatus.REPRODUCED) {
        const independentVerifierEvidence = supporting.filter(
            (candidate) =>
                candidate.origin === EvidenceOrigin.VERIFIER &&
                candidate.evidence.kind === EvidenceKind.VERIFIER_RESULT &&
                candidate.evidence.independent &&
                candidate.sourceBranchId !== claim.branch_id &&
                candidate.reproducible
        );
        if (independentVerifierEvidence.length === 0) {
            reasons.push(
                "Reproduction requires reproducible evidence from an independent verifier"
            );
        }
    }

    if (target === ClaimStatus.REFUTED && contradicting.length === 0) {
        reasons.push("Refutation requires valid contradicting evidence");
    }

    return {
        allowed: reasons.length === 0,
        reasons,
        supportingEvidenceIds: ids(supporting),
        contradictingEvidenceIds: ids(contradicting)
    };
}

export function transitionClaim(
    claim: Claim,
    target: ClaimStatusValue,
    suppliedEvidence: readonly AssessedEvidence[],
    updatedAt: string
): Claim {
    const decision = assessClaimPromotion(claim, target, suppliedEvidence);
    if (!decision.allowed) {
        throw new Error(decision.reasons.join("; "));
    }

    return {
        ...claim,
        status: target,
        supporting_evidence_ids: [
            ...new Set([...claim.supporting_evidence_ids, ...decision.supportingEvidenceIds])
        ],
        contradicting_evidence_ids: [
            ...new Set([...claim.contradicting_evidence_ids, ...decision.contradictingEvidenceIds])
        ],
        stale: target === ClaimStatus.TESTING ? false : claim.stale,
        updated_at: updatedAt
    };
}

function ids(candidates: readonly AssessedEvidence[]): string[] {
    return candidates.map(({ evidence }) => evidence.id);
}
