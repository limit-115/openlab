import { randomUUID } from "node:crypto";
import { HarnessRunStatuses } from "@lab/harness/agent-harness.const";
import type { AgentHarness, HarnessRunResult } from "@lab/harness/agent-harness.types";
import { HarnessCapabilityError } from "@lab/harness/harness-error";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { BranchProgress } from "@lab/protocol/branches/branch-progress.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import { renderHarnessCommand } from "#src/daemon-execution/experiment-record";
import { ExperimentEvaluator } from "#src/daemon-execution/experiment-record.const";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import {
    type DirectorPlan,
    ResearchEvaluatorPrecommitSchema,
    ResearchResultSchema
} from "#src/research-contract/research-contract";
import { RESEARCH_TARGET_KIND } from "#src/research-contract/research-contract.const";
import { freezeResearchEvaluators } from "#src/research-cycle/evaluator-precommit";
import type {
    ResearchBranchInput,
    ResearchBranchResult,
    RoleIdentifiers
} from "#src/research-cycle/research-loop.types";
import {
    failRoleTask,
    finishRoleTask,
    pauseRoleForCapabilities,
    roleIdentifiers
} from "#src/research-cycle/research-role-lifecycle";
import {
    persistAgentCapabilityRequests,
    requestSubscriptionCapability,
    selectHarness
} from "#src/research-cycle/research-stage-run";
import { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";
import type { ResearchWorkspace } from "#src/research-cycle/research-stage-workspace.types";
import {
    runStructuredAgent,
    StructuredAgentRunError
} from "#src/research-cycle/structured-agent-run";
import {
    recordResearchEvidence,
    recordResearchSources
} from "#src/research-evidence/research-evidence";
import { evaluatorPrecommitPrompt, researcherPrompt } from "#src/research-prompts/research-prompts";

export async function runResearchBranch(input: ResearchBranchInput): Promise<ResearchBranchResult> {
    const {
        workspace,
        activity,
        task,
        plan,
        direction,
        directionIndex,
        cycle,
        planTargets,
        available,
        preferredHarnessIndex,
        createAgentWorkspace,
        signal
    } = input;
    const ids = roleIdentifiers(ResearchStage.RESEARCHER, cycle, directionIndex);
    if (!planTargets.some(({ kind }) => kind === RESEARCH_TARGET_KIND.CLAIM)) {
        throw new Error("Director plan unexpectedly contains no claims");
    }
    await prepareResearchBranch(workspace, ids, direction);
    const issues: string[] = [];

    for (let offset = 0; offset < available.length; offset += 1) {
        const harness = selectHarness(available, preferredHarnessIndex + offset).harness;
        const evaluatorWorkspace = await createAgentWorkspace(ResearchStage.RESEARCHER);
        const experimentId = `experiment-${randomUUID()}`;
        let attemptPrepared = false;
        let outcomeAttemptStarted = false;
        try {
            const precommit = await runStructuredAgent({
                workspace,
                activity,
                harness,
                stage: ResearchStage.RESEARCHER,
                branchId: ids.branchId,
                agentId: ids.agentId,
                taskId: ids.taskId,
                agentWorkspace: evaluatorWorkspace,
                prompt: evaluatorPrecommitPrompt(task, plan, direction),
                schema: ResearchEvaluatorPrecommitSchema,
                ...(signal === undefined ? {} : { signal })
            });
            const frozenEvaluators = await freezeResearchEvaluators(
                workspace,
                ids,
                evaluatorWorkspace,
                precommit.value.evaluators,
                planTargets
            );
            const researchWorkspace = await createAgentWorkspace(ResearchStage.RESEARCHER);
            await prepareResearchAttempt(
                workspace,
                ids,
                experimentId,
                direction,
                harness,
                researchWorkspace,
                offset + 1
            );
            attemptPrepared = true;
            const run = await runStructuredAgent({
                workspace,
                activity,
                harness,
                stage: ResearchStage.RESEARCHER,
                branchId: ids.branchId,
                agentId: ids.agentId,
                taskId: ids.taskId,
                agentWorkspace: researchWorkspace,
                prompt: researcherPrompt(task, plan, direction, frozenEvaluators),
                schema: ResearchResultSchema,
                ...(signal === undefined ? {} : { signal })
            });
            /**
             * The researcher ran its own experiments and has returned them. A harness failure before
             * this point cost nothing but a call and is worth retrying elsewhere; from here the work
             * has already happened, and another harness would repeat its effects rather than retry it.
             */
            outcomeAttemptStarted = true;
            const capabilityRequests = await persistAgentCapabilityRequests(
                workspace,
                run.value.capability_requests,
                run.value.capability_blocked
            );
            const recordedSources = await recordResearchSources(
                workspace,
                ids,
                run.value.sources,
                planTargets,
                signal
            );
            const attestedResult = {
                ...run.value,
                sources: recordedSources.sources
            };
            const recorded = await recordResearchEvidence(
                workspace,
                attestedResult,
                ids,
                ids.branchId,
                researchWorkspace,
                planTargets,
                frozenEvaluators,
                {
                    runId: experimentId,
                    manifestPath: run.result.artifacts.manifest.path,
                    manifestSha256: run.result.artifacts.manifest.sha256,
                    manifestBytes: run.result.artifacts.manifest.bytes
                },
                signal
            );
            await finishResearchAttempt(workspace, experimentId, run.result, true);
            if (run.value.capability_blocked && recorded.evidence.length === 0) {
                await pauseRoleForCapabilities(workspace, ids, capabilityRequests);
            } else {
                await finishRoleTask(workspace, ids, BranchStatus.CLOSED);
            }
            return {
                result: recorded.result,
                evidence: recorded.evidence,
                issues: [...issues, ...recordedSources.issues, ...recorded.issues]
            };
        } catch (error) {
            const failedRun = error instanceof StructuredAgentRunError ? error.result : undefined;
            const reason = error instanceof Error ? error.message : String(error);
            if (attemptPrepared) {
                await finishResearchAttempt(workspace, experimentId, failedRun, false, reason);
            }
            issues.push(reason);
            if (signal?.aborted) {
                await failRoleTask(workspace, ids, true);
                throw error;
            }
            if (error instanceof HarnessCapabilityError) {
                await requestSubscriptionCapability(workspace, error.capabilityRequest);
            }
            if (outcomeAttemptStarted) {
                break;
            }
        }
    }

    await failRoleTask(workspace, ids, false);
    return { evidence: [], issues };
}

async function prepareResearchBranch(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    direction: DirectorPlan["directions"][number]
): Promise<void> {
    await workspace.update((draft) => {
        draft.branches.push({
            id: ids.branchId,
            title: direction.title,
            approach: direction.approach,
            status: BranchStatus.ACTIVE,
            progress: BranchProgress.RUNNING
        });
        draft.agents.push({
            id: ids.agentId,
            branch_id: ids.branchId,
            role: AgentRole.RESEARCHER,
            status: AgentStatus.WORKING,
            current_task_id: ids.taskId
        });
        draft.tasks.push({
            id: ids.taskId,
            branch_id: ids.branchId,
            objective: direction.objective,
            context_refs: [],
            status: InternalTaskStatus.RUNNING,
            attempt: 1,
            role: AgentRole.RESEARCHER
        });
    });
    await workspace.appendEvent(EventType.BRANCH_CREATED, { branch_id: ids.branchId });
    await workspace.appendEvent(EventType.TASK_QUEUED, { task_id: ids.taskId });
    await workspace.appendEvent(EventType.TASK_STARTED, { task_id: ids.taskId });
}

async function prepareResearchAttempt(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    experimentId: string,
    direction: DirectorPlan["directions"][number],
    harness: AgentHarness,
    agentWorkspace: ResearchWorkspace,
    attempt: number
): Promise<void> {
    const now = new Date().toISOString();
    await workspace.update((draft) => {
        requiredById(draft.tasks, ids.taskId).attempt = attempt;
        draft.experiments.push({
            id: experimentId,
            task_id: ids.taskId,
            branch_id: ids.branchId,
            hypothesis: direction.objective,
            evaluator: ExperimentEvaluator.AGENT_HARNESS,
            command: harness.kind,
            cwd: agentWorkspace.cwd,
            status: ExperimentStatus.RUNNING,
            started_at: now
        });
    });
    await workspace.appendEvent(EventType.ATTEMPT_PLANNED, {
        attempt_id: experimentId,
        task_id: ids.taskId,
        harness: harness.kind
    });
    await workspace.appendEvent(EventType.ATTEMPT_STARTED, {
        attempt_id: experimentId,
        task_id: ids.taskId,
        harness: harness.kind
    });
    await workspace.appendEvent(EventType.EXPERIMENT_PLANNED, { experiment_id: experimentId });
    await workspace.appendEvent(EventType.EXPERIMENT_STARTED, { experiment_id: experimentId });
}

async function finishResearchAttempt(
    workspace: LabWorkspace,
    experimentId: string,
    run: HarnessRunResult | undefined,
    succeeded: boolean,
    reason?: string
): Promise<void> {
    const finishedAt = new Date().toISOString();
    await workspace.update((draft) => {
        const experiment = requiredById(draft.experiments, experimentId);
        const cancelled = run?.status === HarnessRunStatuses.CANCELLED;
        const timedOut = run?.status === HarnessRunStatuses.TIMED_OUT;
        experiment.status = succeeded
            ? ExperimentStatus.SUCCEEDED
            : cancelled
              ? ExperimentStatus.CANCELLED
              : timedOut
                ? ExperimentStatus.TIMED_OUT
                : ExperimentStatus.FAILED;
        experiment.finished_at = finishedAt;
        if (!succeeded && reason !== undefined) {
            experiment.error = reason;
        }
        if (run !== undefined) {
            experiment.command = renderHarnessCommand(run);
            experiment.exit_code = run.exitCode;
            experiment.output_path = run.artifacts.manifest.path;
            experiment.output_hash = run.artifacts.manifest.sha256;
        }
    });
    const cancelled = run?.status === HarnessRunStatuses.CANCELLED;
    const timedOut = run?.status === HarnessRunStatuses.TIMED_OUT;
    await workspace.appendEvent(
        succeeded
            ? EventType.EXPERIMENT_SUCCEEDED
            : cancelled
              ? EventType.EXPERIMENT_CANCELLED
              : timedOut
                ? EventType.EXPERIMENT_TIMED_OUT
                : EventType.EXPERIMENT_FAILED,
        { experiment_id: experimentId }
    );
    await workspace.appendEvent(
        succeeded
            ? EventType.ATTEMPT_SUCCEEDED
            : cancelled
              ? EventType.ATTEMPT_CANCELLED
              : timedOut
                ? EventType.ATTEMPT_TIMED_OUT
                : EventType.ATTEMPT_FAILED,
        { attempt_id: experimentId }
    );
}
