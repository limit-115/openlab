import { randomUUID } from "node:crypto";
import { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import { EXECUTION_STATUS } from "@lab/executor/constants";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { snapshotAgentArtifacts } from "#src/artifact-integrity/agent-artifact-snapshot";
import {
    assertEvaluatorRejectsNegativeControl,
    executeAttestedEvaluator
} from "#src/daemon-execution/evaluator-attestation";
import type { FrozenEvaluator } from "#src/evaluator-integrity/frozen-evaluator.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type { ResearchResult } from "#src/research-contract/research-contract";
import {
    EVALUATOR_VERDICT,
    RESEARCH_OUTCOME
} from "#src/research-contract/research-contract.const";
import type { RoleIdentifiers } from "#src/research-cycle/research-loop.types";
import type { ResearchWorkspace } from "#src/research-cycle/research-stage-workspace.types";
import type {
    AgentRunAttestation,
    MaterialEvidence,
    PlanTarget
} from "#src/research-evidence/research-evidence.types";

export async function recordResearchEvidence(
    workspace: LabWorkspace,
    result: ResearchResult,
    ids: RoleIdentifiers,
    branchId: string,
    agentWorkspace: ResearchWorkspace,
    planTargets: readonly PlanTarget[],
    frozenEvaluators: readonly FrozenEvaluator[],
    attestation: AgentRunAttestation,
    signal?: AbortSignal
): Promise<{
    result: ResearchResult;
    evidence: MaterialEvidence[];
    issues: string[];
}> {
    const evidence: MaterialEvidence[] = [];
    const issues: string[] = [];
    const normalizedEvidence: ResearchResult["evidence"] = [];
    for (const item of result.evidence) {
        const planTarget = planTargets.find(
            ({ kind, planIndex }) => kind === item.target_kind && planIndex === item.target_index
        );
        if (planTarget === undefined) {
            issues.push(
                `Evidence references unknown ${item.target_kind} index ${item.target_index}`
            );
            continue;
        }
        const snapshot = await snapshotAgentArtifacts(
            workspace.runDirectory,
            agentWorkspace.cwd,
            item.artifact_paths
        );
        issues.push(...snapshot.issues);
        const validatedArtifacts = snapshot.artifacts;
        if (validatedArtifacts.length === 0) {
            issues.push(
                `${item.target_kind} ${item.target_index} has no non-empty artifact the daemon could snapshot`
            );
            continue;
        }
        const frozenEvaluator = frozenEvaluators.find(
            ({ targetKind, targetIndex }) =>
                targetKind === item.target_kind && targetIndex === item.target_index
        );
        if (frozenEvaluator === undefined) {
            issues.push(`${item.target_kind} ${item.target_index} has no daemon-frozen evaluator`);
            continue;
        }

        const evaluation = await executeAttestedEvaluator(
            workspace,
            ids,
            agentWorkspace,
            planTarget.claim,
            planTarget.evaluator,
            frozenEvaluator,
            validatedArtifacts,
            signal
        );
        if (evaluation.result.status !== EXECUTION_STATUS.SUCCEEDED) {
            issues.push(
                `${item.target_kind} ${item.target_index} evaluator ended with ${evaluation.result.status}`
            );
            continue;
        }
        const expectedVerdict = item.contradicts_hypothesis
            ? EVALUATOR_VERDICT.CONTRADICTS
            : EVALUATOR_VERDICT.SUPPORTS;
        if (evaluation.verdict.verdict !== expectedVerdict) {
            issues.push(
                `${item.target_kind} ${item.target_index} model outcome disagrees with the frozen evaluator verdict`
            );
            continue;
        }
        if (evaluation.verdict.verdict === EVALUATOR_VERDICT.SUPPORTS) {
            await assertEvaluatorRejectsNegativeControl(
                workspace,
                ids,
                agentWorkspace,
                planTarget.claim,
                frozenEvaluator,
                validatedArtifacts,
                signal
            );
        }
        const evaluatedOutcome = item.contradicts_hypothesis
            ? RESEARCH_OUTCOME.REFUTED
            : RESEARCH_OUTCOME.SUPPORTED;
        if (result.outcome !== evaluatedOutcome) {
            issues.push("Research outcome disagrees with the daemon-validated evaluator verdict");
            continue;
        }
        const recorded: Evidence = {
            id: `evidence-${randomUUID()}`,
            kind: EvidenceKind.EXPERIMENT,
            claim_id: planTarget.claim.id,
            run_id: attestation.runId,
            artifact_path: attestation.manifestPath,
            artifact_hash: attestation.manifestSha256,
            summary: evaluation.verdict.summary,
            supports: evaluation.verdict.verdict === EVALUATOR_VERDICT.SUPPORTS,
            independent: true,
            created_at: new Date().toISOString()
        };
        await workspace.recordEvidence(recorded);
        await workspace.appendEvent(EventType.EVIDENCE_RECORDED, {
            evidence_id: recorded.id,
            claim_id: recorded.claim_id,
            artifact_path: recorded.artifact_path,
            artifact_sha256: recorded.artifact_hash,
            evaluator_run_id: evaluation.experimentId,
            evaluator_command: evaluation.result.command,
            evaluator_status: evaluation.result.status
        });
        for (const artifact of validatedArtifacts) {
            const artifactEvidence: Evidence = {
                id: `evidence-${randomUUID()}`,
                kind: EvidenceKind.ARTIFACT,
                claim_id: planTarget.claim.id,
                run_id: attestation.runId,
                artifact_path: artifact.path,
                artifact_hash: artifact.sha256,
                summary: evaluation.verdict.summary,
                supports: recorded.supports,
                independent: true,
                created_at: new Date().toISOString()
            };
            await workspace.recordEvidence(artifactEvidence);
            await workspace.appendEvent(EventType.EVIDENCE_RECORDED, {
                evidence_id: artifactEvidence.id,
                claim_id: artifactEvidence.claim_id,
                artifact_path: artifactEvidence.artifact_path,
                artifact_sha256: artifactEvidence.artifact_hash,
                evaluator_run_id: evaluation.experimentId,
                evaluator_status: evaluation.result.status
            });
        }
        evidence.push({
            claimId: recorded.claim_id,
            outcome: evaluatedOutcome,
            assessed: {
                evidence: recorded,
                origin: EvidenceOrigin.EMPIRICAL,
                sourceBranchId: branchId,
                valid: true,
                complete: evaluation.result.manifest.bytes > 0,
                reproducible: false
            }
        });
        normalizedEvidence.push({
            ...item,
            artifact_paths: [
                ...validatedArtifacts.map(({ path: artifactPath }) => artifactPath),
                attestation.manifestPath,
                evaluation.result.manifest.path
            ]
        });
    }
    return {
        result: { ...result, evidence: normalizedEvidence },
        evidence,
        issues
    };
}
