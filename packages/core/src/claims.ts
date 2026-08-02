import {
    ClaimStatus,
    type ClaimStatus as ClaimStatusValue,
    EvidenceKind
} from "@lab/protocol/constants";
import type { Claim, Evidence } from "@lab/protocol/schemas";
import { EvidenceOrigin, type EvidenceOrigin as EvidenceOriginValue } from "#src/constants";

export interface AssessedEvidence {
    readonly evidence: Evidence;
    readonly origin: EvidenceOriginValue;
    readonly sourceBranchId: string;
    readonly valid: boolean;
    readonly complete: boolean;
    readonly reproducible: boolean;
}

export interface ClaimDependency {
    readonly claimId: string;
    readonly dependencyIds: readonly string[];
}

export interface PromotionDecision {
    readonly allowed: boolean;
    readonly reasons: readonly string[];
    readonly supportingEvidenceIds: readonly string[];
    readonly contradictingEvidenceIds: readonly string[];
}

const legalClaimTransitions: Readonly<Record<ClaimStatusValue, ReadonlySet<ClaimStatusValue>>> = {
    [ClaimStatus.PROPOSED]: new Set([ClaimStatus.TESTING, ClaimStatus.REFUTED]),
    [ClaimStatus.TESTING]: new Set([ClaimStatus.SUPPORTED, ClaimStatus.REFUTED]),
    [ClaimStatus.SUPPORTED]: new Set([
        ClaimStatus.TESTING,
        ClaimStatus.REFUTED,
        ClaimStatus.REPRODUCED
    ]),
    [ClaimStatus.REFUTED]: new Set([ClaimStatus.TESTING]),
    [ClaimStatus.REPRODUCED]: new Set([ClaimStatus.TESTING, ClaimStatus.REFUTED])
};

export function evidenceFingerprint(candidate: AssessedEvidence): string {
    const { evidence } = candidate;
    if (evidence.artifact_hash !== undefined) {
        return `artifact-hash\u0000${evidence.artifact_hash}`;
    }
    if (evidence.run_id !== undefined) {
        return `run\u0000${evidence.run_id}`;
    }
    if (evidence.artifact_path !== undefined) {
        return `artifact-path\u0000${evidence.artifact_path}`;
    }
    return [evidence.kind, evidence.summary, String(evidence.supports)].join("\u0000");
}

export function deduplicateEvidence(evidence: readonly AssessedEvidence[]): AssessedEvidence[] {
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();

    return evidence.filter((candidate) => {
        const fingerprint = evidenceFingerprint(candidate);
        if (seenIds.has(candidate.evidence.id) || seenFingerprints.has(fingerprint)) {
            return false;
        }

        seenIds.add(candidate.evidence.id);
        seenFingerprints.add(fingerprint);
        return true;
    });
}

function isUsable(candidate: AssessedEvidence): boolean {
    return candidate.valid && candidate.complete;
}

function isSupport(candidate: AssessedEvidence): boolean {
    return isUsable(candidate) && candidate.evidence.supports;
}

function isContradiction(candidate: AssessedEvidence): boolean {
    return isUsable(candidate) && !candidate.evidence.supports;
}

function ids(candidates: readonly AssessedEvidence[]): string[] {
    return candidates.map(({ evidence }) => evidence.id);
}

export function assessClaimPromotion(
    claim: Claim,
    target: ClaimStatusValue,
    suppliedEvidence: readonly AssessedEvidence[]
): PromotionDecision {
    const reasons: string[] = [];
    const evidence = deduplicateEvidence(suppliedEvidence).filter((candidate) =>
        isUsable(candidate)
    );
    const supporting = evidence.filter(isSupport);
    const contradicting = evidence.filter(isContradiction);

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

export function collectStaleDependents(
    refutedAssumptionIds: ReadonlySet<string>,
    dependencies: readonly ClaimDependency[]
): ReadonlySet<string> {
    const stale = new Set(refutedAssumptionIds);
    let changed = true;

    while (changed) {
        changed = false;
        for (const dependency of dependencies) {
            if (
                !stale.has(dependency.claimId) &&
                dependency.dependencyIds.some((dependencyId) => stale.has(dependencyId))
            ) {
                stale.add(dependency.claimId);
                changed = true;
            }
        }
    }

    for (const refutedId of refutedAssumptionIds) {
        stale.delete(refutedId);
    }

    return stale;
}
