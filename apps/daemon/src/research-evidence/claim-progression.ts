import { randomUUID } from "node:crypto";
import { transitionClaim } from "@lab/core/claims/claim-promotion";
import { collectStaleDependents } from "@lab/core/claims/claim-staleness";
import { ClaimStatus, EventType } from "@lab/protocol/constants";
import type { Claim } from "@lab/protocol/schemas";
import type { EvaluatorTarget } from "#src/evaluator-integrity/frozen-evaluator.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { replaceById } from "#src/lab-workspace/snapshot-entities";
import type { DirectorPlan } from "#src/research-contract/research-contract";
import {
    RESEARCH_OUTCOME,
    RESEARCH_TARGET_KIND,
    type ResearchTargetKind
} from "#src/research-contract/research-contract.const";
import type { MaterialEvidence, PlanTarget } from "#src/research-evidence/research-evidence.types";

export async function prepareClaims(
    workspace: LabWorkspace,
    plan: DirectorPlan,
    branchId: string
): Promise<PlanTarget[]> {
    const assumptionIds: string[] = [];
    const targets: PlanTarget[] = [];
    for (const [planIndex, assumption] of plan.assumptions.entries()) {
        const claim = await ensureTestingClaim(workspace, assumption.statement, branchId, []);
        assumptionIds.push(claim.id);
        targets.push({
            claim,
            evaluator: assumption.falsification_test,
            kind: RESEARCH_TARGET_KIND.ASSUMPTION,
            planIndex
        });
    }

    for (const [planIndex, candidate] of plan.claims.entries()) {
        const claim = await ensureTestingClaim(
            workspace,
            candidate.statement,
            branchId,
            assumptionIds
        );
        targets.push({
            claim,
            evaluator: candidate.evaluator,
            kind: RESEARCH_TARGET_KIND.CLAIM,
            planIndex
        });
    }
    return targets;
}

export function requiredPlanTarget(
    planTargets: readonly PlanTarget[],
    kind: ResearchTargetKind,
    planIndex: number
): PlanTarget {
    const target = planTargets.find(
        (candidate) => candidate.kind === kind && candidate.planIndex === planIndex
    );
    if (target === undefined) {
        throw new Error(`Evaluator references unknown ${kind} index ${planIndex}`);
    }
    return target;
}

export function evaluatorTarget(target: PlanTarget): EvaluatorTarget {
    return {
        kind: target.kind,
        index: target.planIndex,
        claim: target.claim
    };
}

async function ensureTestingClaim(
    workspace: LabWorkspace,
    statement: string,
    branchId: string,
    assumptionIds: readonly string[]
): Promise<Claim> {
    let claim = workspace
        .getSnapshot()
        .claims.find((candidate) => candidate.statement === statement);
    if (claim === undefined) {
        const now = new Date().toISOString();
        claim = {
            id: `claim-${randomUUID()}`,
            branch_id: branchId,
            statement,
            status: ClaimStatus.PROPOSED,
            assumption_ids: [...assumptionIds],
            supporting_evidence_ids: [],
            contradicting_evidence_ids: [],
            stale: false,
            created_at: now,
            updated_at: now
        };
        const created = claim;
        await workspace.update((draft) => draft.claims.push(created));
        await workspace.appendEvent(EventType.CLAIM_PROPOSED, { claim_id: claim.id });
    } else if (assumptionIds.some((id) => !claim?.assumption_ids.includes(id))) {
        claim = {
            ...claim,
            assumption_ids: [...new Set([...claim.assumption_ids, ...assumptionIds])],
            updated_at: new Date().toISOString()
        };
        const updated = claim;
        await workspace.update((draft) => replaceById(draft.claims, updated));
    }
    const wasStale = claim.stale;
    if (
        claim.stale ||
        claim.status === ClaimStatus.PROPOSED ||
        claim.status === ClaimStatus.REFUTED
    ) {
        if (claim.stale && claim.status === ClaimStatus.TESTING) {
            claim = {
                ...claim,
                stale: false,
                updated_at: new Date().toISOString()
            };
        } else {
            claim = transitionClaim(claim, ClaimStatus.TESTING, [], new Date().toISOString());
        }
        const transitioned = claim;
        await workspace.update((draft) => replaceById(draft.claims, transitioned));
        await workspace.appendEvent(EventType.CLAIM_TESTING, {
            claim_id: claim.id,
            stale_evidence_invalidated: wasStale
        });
    }
    return claim;
}

export async function promoteClaimsFromMaterialEvidence(
    workspace: LabWorkspace,
    planTargets: readonly PlanTarget[],
    materialEvidence: readonly MaterialEvidence[],
    progress: Date[]
): Promise<void> {
    for (const { claim: plannedClaim } of planTargets) {
        let claim = workspace.getSnapshot().claims.find(({ id }) => id === plannedClaim.id);
        if (claim === undefined) {
            throw new Error(`Claim disappeared from workspace: ${plannedClaim.id}`);
        }
        const candidates = materialEvidence.filter(({ claimId }) => claimId === claim?.id);
        const contradictions = candidates.filter(
            ({ assessed, outcome }) =>
                outcome === RESEARCH_OUTCOME.REFUTED && !assessed.evidence.supports
        );
        const support = candidates.filter(
            ({ assessed, outcome }) =>
                outcome === RESEARCH_OUTCOME.SUPPORTED && assessed.evidence.supports
        );

        let target: typeof ClaimStatus.SUPPORTED | typeof ClaimStatus.REFUTED | undefined;
        let selected: readonly MaterialEvidence[] = [];
        if (contradictions.length > 0 && claim.status !== ClaimStatus.REFUTED) {
            target = ClaimStatus.REFUTED;
            selected = contradictions;
        } else if (support.length > 0 && claim.status === ClaimStatus.TESTING) {
            target = ClaimStatus.SUPPORTED;
            selected = support;
        }
        if (target === undefined) {
            continue;
        }

        claim = transitionClaim(
            claim,
            target,
            selected.map(({ assessed }) => assessed),
            new Date().toISOString()
        );
        const transitioned = claim;
        await workspace.update((draft) => replaceById(draft.claims, transitioned));
        await workspace.appendEvent(
            target === ClaimStatus.SUPPORTED ? EventType.CLAIM_SUPPORTED : EventType.CLAIM_REFUTED,
            { claim_id: claim.id }
        );
        if (target === ClaimStatus.REFUTED) {
            await markDependentClaimsStale(workspace, claim.id);
        }
        progress.push(new Date());
    }
}

export async function markDependentClaimsStale(
    workspace: LabWorkspace,
    refutedClaimId: string
): Promise<void> {
    const snapshot = workspace.getSnapshot();
    const staleIds = collectStaleDependents(
        new Set([refutedClaimId]),
        snapshot.claims.map((claim) => ({
            claimId: claim.id,
            dependencyIds: claim.assumption_ids
        }))
    );
    if (staleIds.size === 0) {
        return;
    }
    await workspace.update((draft) => {
        for (const claim of draft.claims) {
            if (staleIds.has(claim.id)) {
                claim.stale = true;
                claim.updated_at = new Date().toISOString();
            }
        }
    });
    await Promise.all(
        [...staleIds].map((claimId) =>
            workspace.appendEvent(EventType.CLAIM_STALE, {
                claim_id: claimId,
                refuted_assumption_id: refutedClaimId
            })
        )
    );
}
