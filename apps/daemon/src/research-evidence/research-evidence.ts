import { randomUUID } from "node:crypto";
import path from "node:path";
import { EvidenceOrigin } from "@lab/core/claims/evidence-origin.const";
import { EXECUTION_STATUS } from "@lab/executor/constants";
import type { Evidence } from "@lab/protocol/evidence/evidence.types";
import { EvidenceKind } from "@lab/protocol/evidence/evidence-kind.const";
import { SourceRetrievalMethod } from "@lab/protocol/evidence/source-evidence.const";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { ExternalEffect } from "@lab/protocol/experiments/external-effect.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { snapshotAgentArtifacts } from "#src/artifact-integrity/agent-artifact-snapshot";
import {
    assertEvaluatorRejectsNegativeControl,
    executeAttestedEvaluator
} from "#src/daemon-execution/evaluator-attestation";
import { attemptEventType, experimentEventType } from "#src/daemon-execution/experiment-record";
import { ExperimentEvaluator } from "#src/daemon-execution/experiment-record.const";
import type { FrozenEvaluator } from "#src/evaluator-integrity/frozen-evaluator.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import type { ResearchResult } from "#src/research-contract/research-contract";
import {
    EVALUATOR_VERDICT,
    RESEARCH_OUTCOME
} from "#src/research-contract/research-contract.const";
import type { RoleIdentifiers } from "#src/research-cycle/research-loop.types";
import type { ResearchWorkspace } from "#src/research-cycle/research-stage-workspace.types";
import { uniqueStrings } from "#src/research-cycle/unique-strings";
import type {
    AgentRunAttestation,
    MaterialEvidence,
    PlanTarget
} from "#src/research-evidence/research-evidence.types";
import { fetchDaemonSource } from "#src/source-integrity/source-fetch";
import { SourceFetchOutcome } from "#src/source-integrity/source-fetch.contract";

export async function recordResearchSources(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    candidates: ResearchResult["sources"],
    planTargets: readonly PlanTarget[],
    signal?: AbortSignal
): Promise<{ sources: ResearchResult["sources"]; issues: string[] }> {
    const sources: ResearchResult["sources"] = [];
    const issues: string[] = [];
    for (const candidate of candidates) {
        const target = planTargets.find(
            ({ kind, planIndex }) =>
                kind === candidate.target_kind && planIndex === candidate.target_index
        );
        if (target === undefined) {
            issues.push(
                `Source references unknown ${candidate.target_kind} index ${candidate.target_index}`
            );
            continue;
        }
        const experimentId = `experiment-${randomUUID()}`;
        const startedAt = new Date().toISOString();
        const artifactDirectory = path.join(
            workspace.runDirectory,
            "source-fetches",
            `fetch-${randomUUID()}`
        );
        await workspace.mutateWithEvent(
            EventType.EXPERIMENT_PLANNED,
            { experiment_id: experimentId, source_title: candidate.title },
            (draft) => {
                draft.experiments.push({
                    id: experimentId,
                    task_id: ids.taskId,
                    branch_id: ids.branchId,
                    hypothesis: `Fetch supplemental citation: ${candidate.title}`,
                    evaluator: ExperimentEvaluator.SOURCE_FETCHER,
                    command: "GET daemon-validated source URL",
                    cwd: workspace.runDirectory,
                    status: ExperimentStatus.RUNNING,
                    started_at: startedAt,
                    external_effect: ExternalEffect.NONE
                });
            }
        );
        await workspace.appendEvent(EventType.EXPERIMENT_STARTED, {
            experiment_id: experimentId
        });
        await workspace.appendEvent(EventType.ATTEMPT_PLANNED, {
            attempt_id: experimentId,
            external_effect: ExternalEffect.NONE
        });
        await workspace.appendEvent(EventType.ATTEMPT_STARTED, { attempt_id: experimentId });

        const fetched = await fetchDaemonSource({
            url: candidate.url,
            artifactDirectory,
            ...(signal === undefined ? {} : { signal })
        });
        const status = signal?.aborted
            ? ExperimentStatus.CANCELLED
            : fetched.outcome === SourceFetchOutcome.SUCCEEDED
              ? ExperimentStatus.SUCCEEDED
              : ExperimentStatus.FAILED;
        const failurePayload =
            fetched.outcome === SourceFetchOutcome.REJECTED ? { error: fetched.error } : {};
        await workspace.mutateWithEvent(
            experimentEventType(status),
            { experiment_id: experimentId, ...failurePayload },
            (draft) => {
                const experiment = requiredById(draft.experiments, experimentId);
                experiment.status = status;
                experiment.finished_at = fetched.fetchedAt;
                experiment.output_path = fetched.manifest.path;
                experiment.output_hash = fetched.manifest.sha256;
                if (fetched.outcome === SourceFetchOutcome.REJECTED) {
                    experiment.error = fetched.error;
                }
            }
        );
        await workspace.appendEvent(attemptEventType(status), {
            attempt_id: experimentId,
            ...failurePayload
        });
        if (signal?.aborted) {
            throw signal.reason ?? new Error("Source fetch was cancelled");
        }
        if (fetched.outcome === SourceFetchOutcome.REJECTED) {
            issues.push(`Source ${candidate.title} rejected: ${fetched.error}`);
            continue;
        }

        const evidence: Evidence = {
            id: `evidence-${randomUUID()}`,
            kind: EvidenceKind.SOURCE,
            claim_id: target.claim.id,
            run_id: experimentId,
            artifact_path: fetched.body.path,
            artifact_hash: fetched.body.sha256,
            summary: `Daemon-fetched citation: ${candidate.title}`,
            supports: false,
            independent: false,
            source: {
                requested_url: fetched.requestedUrl,
                final_url: fetched.finalUrl,
                title: candidate.title,
                claimed_classification: candidate.claimed_classification,
                retrieval_method: SourceRetrievalMethod.DAEMON_HTTP,
                http_status: fetched.httpStatus,
                fetched_at: fetched.fetchedAt
            },
            created_at: fetched.fetchedAt
        };
        await workspace.recordEvidence(evidence);
        await workspace.appendEvent(EventType.EVIDENCE_RECORDED, {
            evidence_id: evidence.id,
            claim_id: evidence.claim_id,
            artifact_path: evidence.artifact_path,
            artifact_sha256: evidence.artifact_hash,
            source_url: evidence.source?.final_url,
            source_classification_claimed: evidence.source?.claimed_classification
        });
        sources.push({
            ...candidate,
            url: fetched.finalUrl
        });
    }
    return { sources, issues };
}

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
