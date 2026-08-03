import { randomUUID } from "node:crypto";
import type { AssessedEvidence } from "@lab/core/claims/claim-evidence.types";
import { transitionClaim } from "@lab/core/claims/claim-promotion";
import { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import { EXECUTION_STATUS } from "@lab/executor/constants";
import type { ExecutionResult } from "@lab/executor/types";
import { ClaimStatus } from "@lab/protocol/claims/claim-status.const";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { assertArtifactsUnchanged } from "#src/artifact-integrity/agent-artifact-snapshot";
import type { AgentArtifactSnapshot } from "#src/artifact-integrity/agent-artifact-snapshot.types";
import {
    assertEvaluatorRejectsNegativeControl,
    executeAttestedEvaluator
} from "#src/daemon-execution/evaluator-attestation";
import { ExperimentEvaluator } from "#src/daemon-execution/experiment-record.const";
import type { FrozenEvaluator } from "#src/evaluator-integrity/frozen-evaluator.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { replaceById } from "#src/lab-workspace/snapshot-entities";
import type {
    CriticResult,
    EvaluatorStructuredVerdict,
    VerifierResult
} from "#src/research-contract/research-contract";
import {
    CRITIC_VERDICT,
    EVALUATOR_VERDICT,
    RESEARCH_TARGET_KIND,
    VERIFIER_VERDICT
} from "#src/research-contract/research-contract.const";
import { throwIfAborted } from "#src/research-cycle/research-cancellation";
import type { RoleIdentifiers } from "#src/research-cycle/research-loop.types";
import type { ResearchWorkspace } from "#src/research-cycle/research-stage-workspace.types";
import { uniqueStrings } from "#src/research-cycle/unique-strings";
import { markDependentClaimsStale } from "#src/research-evidence/claim-progression";
import type {
    AgentRunAttestation,
    PlanTarget
} from "#src/research-evidence/research-evidence.types";

export async function recordVerifierEvidence(
    workspace: LabWorkspace,
    verdict: VerifierResult,
    snapshot: AgentArtifactSnapshot,
    attestation: AgentRunAttestation,
    verifierWorkspace: ResearchWorkspace,
    verifierIds: RoleIdentifiers,
    planTargets: readonly PlanTarget[],
    criticism: CriticResult,
    verificationEvaluator: FrozenEvaluator,
    signal?: AbortSignal
): Promise<{ accepted: boolean; completed: boolean; issues: string[] }> {
    const issues: string[] = [...snapshot.issues];
    const planClaim = planTargets.find(
        ({ kind, planIndex }) =>
            kind === RESEARCH_TARGET_KIND.CLAIM && planIndex === verdict.claim_index
    );
    if (planClaim === undefined) {
        return {
            accepted: false,
            completed: false,
            issues: [`Verifier references unknown claim index ${verdict.claim_index}`]
        };
    }
    if (
        verificationEvaluator.targetKind !== RESEARCH_TARGET_KIND.CLAIM ||
        verificationEvaluator.targetIndex !== verdict.claim_index ||
        verificationEvaluator.targetClaimId !== planClaim.claim.id
    ) {
        return {
            accepted: false,
            completed: false,
            issues: ["Verifier verdict does not match the critic-frozen evaluator target"]
        };
    }
    const material: AssessedEvidence[] = [];
    await assertArtifactsUnchanged(snapshot.artifacts);
    const validatedArtifacts = snapshot.artifacts;
    let evaluatorResult: ExecutionResult | undefined;
    let accepted = false;
    if (validatedArtifacts.length > 0) {
        try {
            const evaluation = await executeAttestedEvaluator(
                workspace,
                verifierIds,
                verifierWorkspace,
                planClaim.claim,
                ExperimentEvaluator.INDEPENDENT_VERIFIER,
                verificationEvaluator,
                validatedArtifacts,
                signal
            );
            evaluatorResult = evaluation.result;
            if (evaluatorResult.status !== EXECUTION_STATUS.SUCCEEDED) {
                throw new Error(
                    `Daemon-attested verifier evaluator ended with ${evaluatorResult.status}`
                );
            }
            const expectedVerdict = verificationEvaluatorVerdict(verdict.verdict);
            if (evaluation.verdict.verdict !== expectedVerdict) {
                throw new Error(
                    "Verifier model verdict disagrees with the frozen evaluator verdict"
                );
            }
            if (evaluation.verdict.verdict === EVALUATOR_VERDICT.SUPPORTS) {
                await assertEvaluatorRejectsNegativeControl(
                    workspace,
                    verifierIds,
                    verifierWorkspace,
                    planClaim.claim,
                    verificationEvaluator,
                    validatedArtifacts,
                    signal
                );
            }
            const supports = evaluation.verdict.verdict === EVALUATOR_VERDICT.SUPPORTS;
            const evidence: Evidence = {
                id: `evidence-${randomUUID()}`,
                kind: EvidenceKind.VERIFIER_RESULT,
                claim_id: planClaim.claim.id,
                run_id: attestation.runId,
                artifact_path: attestation.manifestPath,
                artifact_hash: attestation.manifestSha256,
                summary: evaluation.verdict.summary,
                supports,
                independent: true,
                created_at: new Date().toISOString()
            };
            await workspace.recordEvidence(evidence);
            await workspace.appendEvent(EventType.EVIDENCE_RECORDED, {
                evidence_id: evidence.id,
                claim_id: evidence.claim_id,
                artifact_path: evidence.artifact_path,
                artifact_sha256: evidence.artifact_hash,
                evaluator_command: evaluatorResult.command,
                evaluator_exit_code: evaluatorResult.exitCode,
                evaluator_status: evaluatorResult.status
            });
            material.push({
                evidence,
                origin: EvidenceOrigin.VERIFIER,
                sourceBranchId: verifierIds.branchId,
                valid: true,
                complete: attestation.manifestBytes > 0,
                reproducible: true
            });
            for (const artifact of validatedArtifacts) {
                const evidence: Evidence = {
                    id: `evidence-${randomUUID()}`,
                    kind: EvidenceKind.ARTIFACT,
                    claim_id: planClaim.claim.id,
                    run_id: attestation.runId,
                    artifact_path: artifact.path,
                    artifact_hash: artifact.sha256,
                    summary: evaluation.verdict.summary,
                    supports,
                    independent: true,
                    created_at: new Date().toISOString()
                };
                await workspace.recordEvidence(evidence);
                await workspace.appendEvent(EventType.EVIDENCE_RECORDED, {
                    evidence_id: evidence.id,
                    claim_id: evidence.claim_id,
                    artifact_path: evidence.artifact_path,
                    artifact_sha256: evidence.artifact_hash
                });
                material.push({
                    evidence,
                    origin: EvidenceOrigin.VERIFIER,
                    sourceBranchId: verifierIds.branchId,
                    valid: true,
                    complete: artifact.bytes > 0,
                    reproducible: false
                });
            }
            accepted = true;
        } catch (error) {
            throwIfAborted(signal);
            issues.push(
                `Rejected verifier evaluator: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    await workspace.appendEvent(EventType.VERIFIER_VERDICT_RECORDED, {
        branch_id: verifierIds.branchId,
        claim_id: planClaim.claim.id,
        verdict: verdict.verdict,
        material_evidence_ids: material.map(({ evidence }) => evidence.id)
    });
    let claim = workspace.getSnapshot().claims.find(({ id }) => id === planClaim.claim.id);
    if (claim === undefined) {
        throw new Error(`Verifier target claim disappeared: ${planClaim.claim.id}`);
    }
    const hasEvaluatorEvidence = material.some(
        ({ evidence }) => evidence.kind === EvidenceKind.VERIFIER_RESULT
    );

    if (
        verdict.verdict === VERIFIER_VERDICT.REPRODUCED &&
        hasEvaluatorEvidence &&
        criticism.verdict === CRITIC_VERDICT.CREDIBLE &&
        claim.status === ClaimStatus.SUPPORTED
    ) {
        claim = transitionClaim(claim, ClaimStatus.REPRODUCED, material, new Date().toISOString());
        const reproduced = claim;
        await workspace.update((draft) => replaceById(draft.claims, reproduced));
        await workspace.appendEvent(EventType.CLAIM_REPRODUCED, { claim_id: claim.id });
        const verifierEvidenceId = material.find(
            ({ evidence }) => evidence.kind === EvidenceKind.VERIFIER_RESULT
        )?.evidence.id;
        if (verifierEvidenceId === undefined) {
            throw new Error("Reproduced claim unexpectedly has no verifier evidence");
        }
        await workspace.complete({
            summary: verdict.result_statement,
            supportingEvidenceIds: claim.supporting_evidence_ids,
            independentVerifierVerdictId: verifierEvidenceId,
            limitations: uniqueStrings([...verdict.limitations, ...criticism.issues]),
            knownCounterexamples: uniqueStrings([
                ...verdict.known_counterexamples,
                ...criticism.counterexamples
            ])
        });
        return { accepted: true, completed: true, issues };
    }

    if (
        verdict.verdict === VERIFIER_VERDICT.REFUTED &&
        hasEvaluatorEvidence &&
        (claim.status === ClaimStatus.SUPPORTED || claim.status === ClaimStatus.TESTING)
    ) {
        claim = transitionClaim(claim, ClaimStatus.REFUTED, material, new Date().toISOString());
        const refuted = claim;
        await workspace.update((draft) => replaceById(draft.claims, refuted));
        await workspace.appendEvent(EventType.CLAIM_REFUTED, { claim_id: claim.id });
        await markDependentClaimsStale(workspace, claim.id);
    }

    if (verdict.verdict === VERIFIER_VERDICT.REPRODUCED && !hasEvaluatorEvidence) {
        issues.push("A reproduced verdict had no valid machine-readable evaluator artifact");
    }
    if (verdict.verdict === VERIFIER_VERDICT.REPRODUCED && claim.status !== ClaimStatus.SUPPORTED) {
        issues.push("The verifier targeted a claim without validated supporting evidence");
    }
    if (criticism.verdict !== CRITIC_VERDICT.CREDIBLE) {
        issues.push("Adversarial review did not clear the claim for completion");
    }
    return { accepted, completed: false, issues };
}

function verificationEvaluatorVerdict(
    verdict: VerifierResult["verdict"]
): EvaluatorStructuredVerdict["verdict"] {
    switch (verdict) {
        case VERIFIER_VERDICT.REPRODUCED:
            return EVALUATOR_VERDICT.SUPPORTS;
        case VERIFIER_VERDICT.REFUTED:
            return EVALUATOR_VERDICT.CONTRADICTS;
        case VERIFIER_VERDICT.INCONCLUSIVE:
            return EVALUATOR_VERDICT.INCONCLUSIVE;
    }
}
