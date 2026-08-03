import { setTimeout as delay } from "node:timers/promises";
import { AgentRole } from "@lab/protocol/agents/agent-role.const";
import { AgentStatus } from "@lab/protocol/agents/agent-status.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import { CapabilityResourceClass } from "@lab/protocol/capabilities/capability-request.const";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { LabState } from "@lab/protocol/lab-lifecycle/lab-state.const";
import { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import { snapshotAgentArtifacts } from "#src/artifact-integrity/agent-artifact-snapshot";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import { directorPlanSchema, VerifierResultSchema } from "#src/research-contract/research-contract";
import { createHarnesses } from "#src/research-cycle/harness-roster";
import { DEFAULT_HARNESS_KINDS } from "#src/research-cycle/harness-roster.const";
import { runResearchBranch } from "#src/research-cycle/research-branch";
import { throwIfAborted } from "#src/research-cycle/research-cancellation";
import { taskForCycle, updateFrontier } from "#src/research-cycle/research-frontier";
import {
    DEFAULT_CYCLE_BACKOFF_MS,
    DEFAULT_PLATEAU_INACTIVITY_MS,
    PromiseSettlement,
    ResearchLoopOutcomeStatus
} from "#src/research-cycle/research-loop.const";
import type {
    CreateResearchWorkspace,
    ResearchBranchResult,
    ResearchCycleInput,
    ResearchCycleResult,
    ResearchLoopOptions,
    ResearchLoopOutcome
} from "#src/research-cycle/research-loop.types";
import { waitForConfirmedPlateau } from "#src/research-cycle/research-plateau";
import {
    failRoleTask,
    finishRoleTask,
    pauseRoleForCapabilities,
    prepareDirector,
    prepareRoleTask,
    roleIdentifiers
} from "#src/research-cycle/research-role-lifecycle";
import {
    preferredDifferentHarnessIndex,
    preflightHarnesses,
    runCriticStageWithFallback,
    runStageWithFallback,
    StageCapabilityBlockedError
} from "#src/research-cycle/research-stage-run";
import { GitResearchWorkspaceFactory } from "#src/research-cycle/research-stage-workspace";
import { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";
import type { ResearchWorkspaceFactory } from "#src/research-cycle/research-stage-workspace.types";
import {
    cancelActiveWork,
    reconcileInterruptedWork
} from "#src/research-cycle/research-work-recovery";
import { uniqueStrings } from "#src/research-cycle/unique-strings";
import {
    prepareClaims,
    promoteClaimsFromMaterialEvidence
} from "#src/research-evidence/claim-progression";
import { recordVerifierEvidence } from "#src/research-evidence/verifier-evidence";
import {
    criticPrompt,
    directorPrompt,
    verifierPrompt
} from "#src/research-prompts/research-prompts";

export async function runResearchLoop(
    workspace: LabWorkspace,
    options: ResearchLoopOptions = {}
): Promise<ResearchLoopOutcome> {
    const signal = options.signal;
    const activity = options.activity ?? new AgentActivityHub();
    if (signal?.aborted) {
        return { status: ResearchLoopOutcomeStatus.CANCELLED };
    }

    const harnesses = options.harnesses ?? createHarnesses(DEFAULT_HARNESS_KINDS);
    const workspaceFactory =
        options.workspaceFactory ?? new GitResearchWorkspaceFactory(workspace.runDirectory);
    const createAgentWorkspace = workspaceAllocator(workspaceFactory);
    const plateauInactivityMs = options.plateauInactivityMs ?? DEFAULT_PLATEAU_INACTIVITY_MS;
    const waitForPlateau = options.waitForPlateau ?? defaultPlateauWait;
    const cycleBackoffMs = options.cycleBackoffMs ?? DEFAULT_CYCLE_BACKOFF_MS;
    const waitForCycle = options.waitForCycle ?? defaultPlateauWait;

    try {
        if (workspace.recovered) {
            await reconcileInterruptedWork(workspace);
        }
        const available = await preflightHarnesses(workspace, harnesses, signal);
        throwIfAborted(signal);
        if (available.length === 0) {
            const reason = "No subscription-authenticated agent CLI harness is available";
            if (workspace.getSnapshot().capability_requests.length === 0) {
                await workspace.requestCapability({
                    need: "A responsive Codex, Claude or GLM CLI with an active product subscription",
                    resourceClass: CapabilityResourceClass.ACCOUNT,
                    reason,
                    provisioningHint:
                        "Restore a local product-subscription CLI session and retry; API billing is forbidden"
                });
            }
            await blockForUnavailableHarnesses(workspace, reason);
            return { status: ResearchLoopOutcomeStatus.HIBERNATING, reason };
        }

        const task = await workspace.getTask();
        let cycle = workspace.recovered ? 1 : 0;
        while (workspace.getSnapshot().lab.state === LabState.RUNNING) {
            throwIfAborted(signal);
            const cycleStartedAt = new Date();
            const cycleResult = await runResearchCycle({
                workspace,
                activity,
                task: taskForCycle(task, workspace, cycle),
                available,
                createAgentWorkspace,
                cycle,
                ...(signal === undefined ? {} : { signal })
            });
            if (cycleResult.completed) {
                return { status: ResearchLoopOutcomeStatus.COMPLETED };
            }
            if (cycleResult.nextExperiments.length > 0) {
                await waitForCycle(cycleBackoffMs, signal);
                cycle += 1;
                continue;
            }

            const plateau = await waitForConfirmedPlateau(
                workspace,
                cycleStartedAt,
                cycleResult.progress,
                plateauInactivityMs,
                waitForPlateau,
                signal
            );
            if (!plateau) {
                cycle += 1;
                continue;
            }

            const reason = "No informative experiment remains after independent review";
            await workspace.appendEvent(EventType.PLATEAU_CONFIRMED, { reason });
            await workspace.hibernateForPlateau(reason);
            return { status: ResearchLoopOutcomeStatus.HIBERNATING, reason };
        }

        return { status: ResearchLoopOutcomeStatus.CANCELLED };
    } catch (error) {
        if (signal?.aborted) {
            await cancelActiveWork(workspace);
            return { status: ResearchLoopOutcomeStatus.CANCELLED };
        }

        if (error instanceof StageCapabilityBlockedError) {
            await blockForUnavailableHarnesses(workspace, error.message);
            return {
                status: ResearchLoopOutcomeStatus.HIBERNATING,
                reason: error.message
            };
        }

        const reason = error instanceof Error ? error.message : String(error);
        if (workspace.getSnapshot().lab.state === LabState.RUNNING) {
            await workspace.transition(LabState.FAILED, reason, { failureReason: reason });
            await workspace.appendEvent(EventType.LAB_FAILED, { reason });
        }
        return { status: ResearchLoopOutcomeStatus.FAILED, reason };
    }
}

async function blockForUnavailableHarnesses(
    workspace: LabWorkspace,
    reason: string
): Promise<void> {
    await workspace.update((draft) => {
        draft.frontier.next_experiments = [];
        for (const branch of draft.branches) {
            if (branch.status === BranchStatus.ACTIVE) {
                branch.status = BranchStatus.PAUSED;
                branch.progress = reason;
            }
        }
        for (const agent of draft.agents) {
            if (agent.status === AgentStatus.WORKING) {
                agent.status = AgentStatus.BLOCKED;
            }
        }
    });
    await workspace.appendEvent(EventType.FRONTIER_UPDATED, { reason });
    await workspace.appendEvent(EventType.PLATEAU_CONFIRMED, {
        reason,
        capability_blocked: true
    });
    await workspace.hibernateForPlateau(reason);
}

async function runResearchCycle(input: ResearchCycleInput): Promise<ResearchCycleResult> {
    const { workspace, activity, task, available, createAgentWorkspace, cycle, signal } = input;
    const progress: Date[] = [];
    const directorIds = await prepareDirector(workspace, cycle);
    const { value: plan } = await runStageWithFallback({
        workspace,
        activity,
        available,
        preferredIndex: cycle,
        stage: ResearchStage.DIRECTOR,
        branchId: directorIds.branchId,
        agentId: directorIds.agentId,
        taskId: directorIds.taskId,
        createAgentWorkspace,
        prompt: directorPrompt(task),
        schema: directorPlanSchema(task, {
            recovered: workspace.recovered,
            frontierBlockers: workspace.getSnapshot().frontier.blockers
        }),
        ...(signal === undefined ? {} : { signal })
    });
    await finishRoleTask(workspace, directorIds, BranchStatus.CLOSED);
    await workspace.appendEvent(EventType.GOAL_OPERATIONALIZED, {
        branch_id: directorIds.branchId,
        claims: plan.claims.length,
        directions: plan.directions.length
    });

    const planTargets = await prepareClaims(workspace, plan, directorIds.branchId);
    const settledBranches = await Promise.allSettled(
        plan.directions.map((direction, index) =>
            runResearchBranch({
                workspace,
                activity,
                task,
                plan,
                direction,
                directionIndex: index,
                cycle,
                planTargets,
                available,
                preferredHarnessIndex: cycle + index + 1,
                createAgentWorkspace,
                ...(signal === undefined ? {} : { signal })
            })
        )
    );
    const rejectedBranch = settledBranches.find(
        (result): result is PromiseRejectedResult => result.status === PromiseSettlement.REJECTED
    );
    if (signal?.aborted && rejectedBranch !== undefined) {
        throw rejectedBranch.reason;
    }
    const branchResults = settledBranches.map((result): ResearchBranchResult => {
        if (result.status === PromiseSettlement.FULFILLED) {
            return result.value;
        }
        return {
            evidence: [],
            evaluatorIdentities: [],
            artifactSha256s: [],
            issues: [result.reason instanceof Error ? result.reason.message : String(result.reason)]
        };
    });
    const materialEvidence = branchResults.flatMap(({ evidence }) => evidence);
    if (materialEvidence.length > 0) {
        progress.push(new Date());
    }
    await promoteClaimsFromMaterialEvidence(workspace, planTargets, materialEvidence, progress);

    const successfulResults = branchResults.flatMap(({ result }) =>
        result === undefined ? [] : [result]
    );
    const issues = branchResults.flatMap(({ issues }) => issues);
    const researcherEvaluatorIdentities = branchResults.flatMap(
        ({ evaluatorIdentities }) => evaluatorIdentities
    );
    const researcherArtifactSha256s = branchResults.flatMap(
        ({ artifactSha256s }) => artifactSha256s
    );
    if (successfulResults.length === 0) {
        const nextExperiments: string[] = [];
        await updateFrontier(workspace, [], nextExperiments, issues);
        return { completed: false, nextExperiments, progress };
    }

    const criticIds = roleIdentifiers(ResearchStage.CRITIC, cycle, 0);
    await prepareRoleTask(
        workspace,
        criticIds,
        AgentRole.CRITIC,
        "Adversarial review",
        "Falsify branch results and evaluator assumptions"
    );
    const criticRun = await runCriticStageWithFallback({
        workspace,
        activity,
        available,
        preferredIndex: cycle + plan.directions.length + 1,
        ids: criticIds,
        createAgentWorkspace,
        prompt: criticPrompt(task, plan, successfulResults),
        planTargets,
        researcherEvaluatorIdentities,
        ...(signal === undefined ? {} : { signal })
    });
    const criticism = criticRun.value;
    const verificationEvaluator = criticRun.evaluator;
    await finishRoleTask(workspace, criticIds, BranchStatus.CLOSED);

    const verifierIds = roleIdentifiers(ResearchStage.VERIFIER, cycle, 0);
    await prepareRoleTask(
        workspace,
        verifierIds,
        AgentRole.VERIFIER,
        "Independent verification",
        "Reproduce the strongest material claim in a clean workspace"
    );
    const verifierPreferredIndex = preferredDifferentHarnessIndex(available, criticRun.harness);
    const verifierRun = await runStageWithFallback({
        workspace,
        activity,
        available,
        preferredIndex: verifierPreferredIndex,
        stage: ResearchStage.VERIFIER,
        branchId: verifierIds.branchId,
        agentId: verifierIds.agentId,
        taskId: verifierIds.taskId,
        createAgentWorkspace,
        prompt: verifierPrompt(task, plan, successfulResults, criticism),
        schema: VerifierResultSchema,
        ...(signal === undefined ? {} : { signal })
    });
    if (verifierRun.value.capability_blocked) {
        await pauseRoleForCapabilities(workspace, verifierIds, verifierRun.capabilityRequests);
        const capabilityIssues = verifierRun.capabilityRequests.map(
            ({ need }) => `Verifier capability required: ${need}`
        );
        await updateFrontier(
            workspace,
            [verifierRun.value.result_statement],
            [],
            [...issues, ...criticism.issues, ...capabilityIssues]
        );
        return { completed: false, nextExperiments: [], progress };
    }
    let verification: Awaited<ReturnType<typeof recordVerifierEvidence>>;
    try {
        const verifierSnapshot = await snapshotAgentArtifacts(
            workspace.runDirectory,
            verifierRun.agentWorkspace.cwd,
            verifierRun.value.evidence_artifact_paths
        );
        verification = await recordVerifierEvidence(
            workspace,
            verifierRun.value,
            verifierSnapshot,
            {
                runId: verifierIds.taskId,
                manifestPath: verifierRun.result.artifacts.manifest.path,
                manifestSha256: verifierRun.result.artifacts.manifest.sha256,
                manifestBytes: verifierRun.result.artifacts.manifest.bytes
            },
            verifierRun.agentWorkspace,
            verifierIds,
            planTargets,
            criticism,
            verificationEvaluator,
            researcherArtifactSha256s,
            signal
        );
    } catch (error) {
        if (signal?.aborted) {
            throw error;
        }
        verification = {
            accepted: false,
            completed: false,
            issues: [error instanceof Error ? error.message : String(error)]
        };
    }
    if (verification.accepted) {
        await finishRoleTask(workspace, verifierIds, BranchStatus.CLOSED);
    } else {
        await failRoleTask(workspace, verifierIds, false);
    }

    if (verification.completed) {
        progress.push(new Date());
        return { completed: true, nextExperiments: [], progress };
    }

    const nextExperiments = uniqueStrings([
        ...successfulResults.flatMap((result) => result.next_experiments),
        ...criticism.next_experiments,
        ...verification.issues
    ]);
    const known = uniqueStrings([
        ...successfulResults.map(({ summary }) => summary),
        criticism.summary,
        ...criticism.counterexamples,
        verifierRun.value.result_statement
    ]);
    await updateFrontier(workspace, known, nextExperiments, [
        ...issues,
        ...criticism.issues,
        ...verification.issues
    ]);
    return { completed: false, nextExperiments, progress };
}

function workspaceAllocator(factory: ResearchWorkspaceFactory): CreateResearchWorkspace {
    const nextOrdinal: Record<ResearchStage, number> = {
        [ResearchStage.DIRECTOR]: 0,
        [ResearchStage.RESEARCHER]: 0,
        [ResearchStage.CRITIC]: 0,
        [ResearchStage.VERIFIER]: 0
    };
    return async (stage) => {
        const ordinal = nextOrdinal[stage];
        nextOrdinal[stage] += 1;
        return factory.create(stage, ordinal);
    };
}

async function defaultPlateauWait(milliseconds: number, signal?: AbortSignal): Promise<void> {
    await delay(milliseconds, undefined, signal === undefined ? {} : { signal });
}
