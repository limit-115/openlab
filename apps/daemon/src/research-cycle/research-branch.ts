import { randomUUID } from "node:crypto";
import { HarnessExecutionProfiles, HarnessRunStatuses } from "@lab/harness/agent-harness.const";
import type { AgentHarness, HarnessRunResult } from "@lab/harness/agent-harness.types";
import { HarnessCapabilityError } from "@lab/harness/harness-error";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import { ExperimentStatus } from "@lab/protocol/experiments/experiment-status.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import { InternalTaskStatus } from "@lab/protocol/task-queue/internal-task-status.const";
import { renderHarnessCommand } from "#src/daemon-execution/experiment-record";
import { ExperimentEvaluator } from "#src/daemon-execution/experiment-record.const";
import {
    assertCleanOutcomeWorkspace,
    executeResearchOutcome
} from "#src/daemon-execution/outcome-execution";
import type { OutcomeExecution } from "#src/daemon-execution/outcome-execution.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import {
    type DirectorPlan,
    ResearchEvaluatorPrecommitSchema,
    ResearchResultSchema
} from "#src/research-contract/research-contract";
import { RESEARCH_TARGET_KIND } from "#src/research-contract/research-contract.const";
import { freezeResearchEvaluators } from "#src/research-cycle/evaluator-precommit";
import { BranchProgress } from "#src/research-cycle/research-loop.const";
import type {
    AvailableHarness,
    CreateResearchWorkspace,
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
import type { PlanTarget } from "#src/research-evidence/research-evidence.types";
import { evaluatorPrecommitPrompt, researcherPrompt } from "#src/research-prompts/research-prompts";

export async function runResearchBranch(
    workspace: LabWorkspace,
    task: TaskInput,
    plan: DirectorPlan,
    direction: DirectorPlan["directions"][number],
    directionIndex: number,
    cycle: number,
    planTargets: readonly PlanTarget[],
    available: readonly AvailableHarness[],
    preferredHarnessIndex: number,
    createAgentWorkspace: CreateResearchWorkspace,
    signal?: AbortSignal
): Promise<ResearchBranchResult> {
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
            const outcomeWorkspace = await createAgentWorkspace(ResearchStage.RESEARCHER);
            await assertCleanOutcomeWorkspace(outcomeWorkspace);
            await prepareResearchAttempt(
                workspace,
                ids,
                experimentId,
                direction,
                harness,
                outcomeWorkspace,
                offset + 1
            );
            attemptPrepared = true;
            const run = await runStructuredAgent({
                workspace,
                harness,
                stage: ResearchStage.RESEARCHER,
                branchId: ids.branchId,
                agentId: ids.agentId,
                taskId: ids.taskId,
                agentWorkspace: outcomeWorkspace,
                prompt: researcherPrompt(task, plan, direction, frozenEvaluators),
                schema: ResearchResultSchema,
                executionProfile: HarnessExecutionProfiles.READ_ONLY,
                ...(signal === undefined ? {} : { signal })
            });
            const capabilityRequests = await persistAgentCapabilityRequests(
                workspace,
                run.value.capability_requests
            );
            const recordedSources = await recordResearchSources(
                workspace,
                ids,
                run.value.sources,
                planTargets,
                signal
            );
            const sourceAttestedResult = {
                ...run.value,
                sources: recordedSources.sources
            };
            const executionPlan = run.value.execution_plan;
            let outcomeExecution: OutcomeExecution | undefined;
            if (executionPlan !== undefined) {
                outcomeAttemptStarted = true;
                outcomeExecution = await executeResearchOutcome(
                    workspace,
                    ids,
                    outcomeWorkspace,
                    executionPlan,
                    signal
                );
            }
            const attestedResult =
                outcomeExecution === undefined
                    ? sourceAttestedResult
                    : {
                          ...sourceAttestedResult,
                          evidence: run.value.evidence.map((item) => ({
                              ...item,
                              artifact_paths: outcomeExecution.artifacts.map(
                                  ({ path: artifactPath }) => artifactPath
                              )
                          }))
                      };
            const recorded = await recordResearchEvidence(
                workspace,
                attestedResult,
                ids,
                ids.branchId,
                outcomeWorkspace,
                evaluatorWorkspace,
                planTargets,
                frozenEvaluators,
                outcomeExecution,
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
                evaluatorIdentities: frozenEvaluators.map(
                    ({ semanticIdentitySha256 }) => semanticIdentitySha256
                ),
                artifactSha256s: recorded.artifactSha256s,
                issues: [...issues, ...recordedSources.issues, ...recorded.issues]
            };
        } catch (error) {
            const failedRun = error instanceof StructuredAgentRunError ? error.result : undefined;
            if (attemptPrepared) {
                await finishResearchAttempt(workspace, experimentId, failedRun, false);
            }
            issues.push(error instanceof Error ? error.message : String(error));
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
    return { evidence: [], evaluatorIdentities: [], artifactSha256s: [], issues };
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
    succeeded: boolean
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
