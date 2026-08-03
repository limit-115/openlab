import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { freezeEvaluator } from "#src/evaluator-integrity/frozen-evaluator";
import type { FrozenEvaluator } from "#src/evaluator-integrity/frozen-evaluator.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type { EvaluatorPrecommit } from "#src/research-contract/research-contract";
import type { RoleIdentifiers } from "#src/research-cycle/research-loop.types";
import type { ResearchWorkspace } from "#src/research-cycle/research-stage-workspace.types";
import { evaluatorTarget, requiredPlanTarget } from "#src/research-evidence/claim-progression";
import type { PlanTarget } from "#src/research-evidence/research-evidence.types";

export async function freezeResearchEvaluators(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    agentWorkspace: ResearchWorkspace,
    candidates: readonly EvaluatorPrecommit[],
    planTargets: readonly PlanTarget[]
): Promise<FrozenEvaluator[]> {
    const frozen: FrozenEvaluator[] = [];
    const seenTargets = new Set<string>();
    for (const candidate of candidates) {
        const target = requiredPlanTarget(
            planTargets,
            candidate.target_kind,
            candidate.target_index
        );
        const targetKey = `${target.kind}\u0000${target.planIndex}`;
        if (seenTargets.has(targetKey)) {
            throw new Error(
                "A research branch cannot precommit multiple evaluators for one target"
            );
        }
        seenTargets.add(targetKey);
        const evaluator = await freezeEvaluator(
            agentWorkspace.cwd,
            workspace.runDirectory,
            candidate,
            evaluatorTarget(target)
        );
        frozen.push(evaluator);
        await recordEvaluatorPrecommit(workspace, ids, evaluator);
    }
    return frozen;
}

export async function recordEvaluatorPrecommit(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    evaluator: FrozenEvaluator
): Promise<void> {
    await workspace.appendEvent(EventType.EVALUATOR_PRECOMMITTED, {
        branch_id: ids.branchId,
        task_id: ids.taskId,
        target_kind: evaluator.targetKind,
        target_index: evaluator.targetIndex,
        target_claim_id: evaluator.targetClaimId,
        evaluator_path: evaluator.file,
        evaluator_sha256: evaluator.fileSha256,
        evaluator_semantic_identity_sha256: evaluator.semanticIdentitySha256,
        args: evaluator.args,
        success_contract: evaluator.successContract
    });
}
