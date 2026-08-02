import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { type AssessedEvidence, collectStaleDependents, transitionClaim } from "@lab/core/claims";
import { EvidenceOrigin, ProgressKind, SchedulerLane } from "@lab/core/constants";
import { assessPlateau, type ResearchFrontier } from "@lab/core/frontier";
import { EXECUTION_STATUS, type ExecutionStatus } from "@lab/executor/constants";
import { runExperiment } from "@lab/executor/run";
import type { ExecutionResult } from "@lab/executor/types";
import { ClaudeHarness } from "@lab/harness/claude";
import { CodexHarness } from "@lab/harness/codex";
import {
    type AgentHarness,
    type HarnessPreflight,
    type HarnessRunResult,
    HarnessRunStatuses
} from "@lab/harness/contract";
import { sanitizeHarnessEnvironment } from "@lab/harness/environment";
import { HarnessCapabilityError } from "@lab/harness/errors";
import {
    AgentRole,
    AgentStatus,
    BranchStatus,
    CapabilityStatus,
    ClaimStatus,
    EventType,
    EvidenceKind,
    ExperimentStatus,
    InternalTaskStatus,
    LabState
} from "@lab/protocol/constants";
import type { CapabilityRequest, Claim, Evidence, TaskInput } from "@lab/protocol/schemas";
import type { z } from "zod";
import { type ValidatedArtifact, validateFileArtifact } from "#src/artifact";
import {
    assertEvaluatorUnchanged,
    bindEvaluatorInput,
    type EvaluatorTarget,
    type FrozenEvaluator,
    freezeEvaluator,
    validateEvaluatorVerdict
} from "#src/evaluator";
import {
    type CapabilityRequestCandidate,
    CRITIC_VERDICT,
    type CriticResult,
    CriticResultSchema,
    type DirectorPlan,
    DirectorPlanSchema,
    EVALUATOR_VERDICT,
    type EvaluatorPrecommit,
    type EvaluatorStructuredVerdict,
    RESEARCH_OUTCOME,
    RESEARCH_TARGET_KIND,
    ResearchEvaluatorPrecommitSchema,
    type ResearchResult,
    ResearchResultSchema,
    type ResearchTargetKind,
    VERIFIER_VERDICT,
    VerifierResultSchema
} from "#src/research-contract";
import { initialResearchIdentifiers } from "#src/research-identifiers";
import {
    criticPrompt,
    directorPrompt,
    evaluatorPrecommitPrompt,
    researcherPrompt,
    verifierPrompt
} from "#src/research-prompts";
import {
    GitResearchWorkspaceFactory,
    ResearchStage,
    type ResearchWorkspace,
    type ResearchWorkspaceFactory
} from "#src/research-workspace";
import {
    runStructuredAgent,
    StructuredAgentRunError,
    type StructuredAgentRunOutput
} from "#src/structured-agent-run";
import type { LabWorkspace } from "#src/workspace";

export const ResearchLoopOutcomeStatus = {
    COMPLETED: "completed",
    HIBERNATING: "hibernating",
    CANCELLED: "cancelled",
    FAILED: "failed"
} as const;
export type ResearchLoopOutcomeStatus =
    (typeof ResearchLoopOutcomeStatus)[keyof typeof ResearchLoopOutcomeStatus];

const BranchProgress = {
    RUNNING: "Running",
    FINISHED: "Finished",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
    CAPABILITY_BLOCKED: "Blocked on a required capability"
} as const;

const ExperimentEvaluator = {
    AGENT_HARNESS: "Subscription CLI research agent",
    INDEPENDENT_VERIFIER: "Daemon-attested independent evaluator",
    NEGATIVE_CONTROL: "Daemon-owned negative control"
} as const;

const CleanWorkspaceEntry = {
    GIT: ".git"
} as const;

const PromiseSettlement = {
    FULFILLED: "fulfilled",
    REJECTED: "rejected"
} as const;

const ResearchContextEntryType = {
    PROVIDED_CAPABILITY: "provided_capability",
    OPEN_CLAIM: "open_claim",
    OPEN_QUESTION: "open_question",
    BLOCKER: "blocker"
} as const;

const ResearchContextPrefix = {
    NEXT_EXPERIMENT: "Next experiment:"
} as const;

const DEFAULT_PLATEAU_INACTIVITY_MS = 60_000;
const DEFAULT_CYCLE_BACKOFF_MS = 5_000;
const VERIFIER_EVALUATOR_TIMEOUT_MS = 300_000;

export interface ResearchLoopOutcome {
    readonly status: ResearchLoopOutcomeStatus;
    readonly reason?: string;
}

export interface ResearchLoopOptions {
    readonly harnesses?: readonly AgentHarness[];
    readonly workspaceFactory?: ResearchWorkspaceFactory;
    readonly signal?: AbortSignal;
    readonly plateauInactivityMs?: number;
    readonly waitForPlateau?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
    readonly cycleBackoffMs?: number;
    readonly waitForCycle?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}

interface AvailableHarness {
    readonly harness: AgentHarness;
    readonly preflight: HarnessPreflight;
}

interface PlanTarget {
    readonly claim: Claim;
    readonly evaluator: string;
    readonly kind: ResearchTargetKind;
    readonly planIndex: number;
}

interface MaterialEvidence {
    readonly assessed: AssessedEvidence;
    readonly claimId: string;
    readonly outcome: ResearchResult["outcome"];
}

interface ResearchBranchResult {
    readonly result?: ResearchResult;
    readonly evidence: readonly MaterialEvidence[];
    readonly evaluatorIdentities: readonly string[];
    readonly artifactSha256s: readonly string[];
    readonly issues: readonly string[];
}

interface ResearchCycleResult {
    readonly completed: boolean;
    readonly nextExperiments: readonly string[];
    readonly progress: readonly Date[];
}

interface RoleIdentifiers {
    readonly branchId: string;
    readonly agentId: string;
    readonly taskId: string;
}

type CreateResearchWorkspace = (stage: ResearchStage) => Promise<ResearchWorkspace>;

interface StageRunOutput<Output> extends StructuredAgentRunOutput<Output> {
    readonly harness: AgentHarness;
    readonly agentWorkspace: ResearchWorkspace;
}

interface AgentCapabilityOutput {
    readonly capability_requests: readonly CapabilityRequestCandidate[];
}

class StageCapabilityBlockedError extends Error {
    constructor(stage: ResearchStage) {
        super(`All subscription CLI harnesses lost required capabilities during ${stage}`);
        this.name = "StageCapabilityBlockedError";
    }
}

interface CriticStageRunOutput extends StageRunOutput<CriticResult> {
    readonly evaluator: FrozenEvaluator;
}

export async function runResearchLoop(
    workspace: LabWorkspace,
    options: ResearchLoopOptions = {}
): Promise<ResearchLoopOutcome> {
    const signal = options.signal;
    if (signal?.aborted) {
        return { status: ResearchLoopOutcomeStatus.CANCELLED };
    }

    const harnesses = options.harnesses ?? [new CodexHarness(), new ClaudeHarness()];
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
            const reason = "No subscription-authenticated Codex or Claude CLI harness is available";
            if (workspace.getSnapshot().capability_requests.length === 0) {
                await workspace.requestCapability({
                    need: "A responsive Codex or Claude CLI with an active product subscription",
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
            const cycleResult = await runResearchCycle(
                workspace,
                taskForCycle(task, workspace, cycle),
                available,
                createAgentWorkspace,
                cycle,
                signal
            );
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

async function preflightHarnesses(
    workspace: LabWorkspace,
    harnesses: readonly AgentHarness[],
    signal?: AbortSignal
): Promise<AvailableHarness[]> {
    const results = await Promise.all(
        harnesses.map(async (harness): Promise<AvailableHarness | undefined> => {
            try {
                const preflight = await harness.preflight(signal);
                await workspace.appendEvent(EventType.HARNESS_PREFLIGHT_SUCCEEDED, {
                    harness: harness.kind,
                    cli_version: preflight.cliVersion,
                    authentication_method: preflight.authentication.method,
                    subscription: preflight.authentication.subscription
                });
                return { harness, preflight };
            } catch (error) {
                if (signal?.aborted) {
                    throw error;
                }
                await workspace.appendEvent(EventType.HARNESS_PREFLIGHT_FAILED, {
                    harness: harness.kind,
                    error: error instanceof Error ? error.message : String(error)
                });
                if (error instanceof HarnessCapabilityError) {
                    await workspace.requestCapability(error.capabilityRequest);
                }
                return undefined;
            }
        })
    );
    return results.filter((result): result is AvailableHarness => result !== undefined);
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

async function runResearchCycle(
    workspace: LabWorkspace,
    task: TaskInput,
    available: readonly AvailableHarness[],
    createAgentWorkspace: CreateResearchWorkspace,
    cycle: number,
    signal?: AbortSignal
): Promise<ResearchCycleResult> {
    const progress: Date[] = [];
    const directorIds = await prepareDirector(workspace, cycle);
    const { value: plan } = await runStageWithFallback({
        workspace,
        available,
        preferredIndex: cycle,
        stage: ResearchStage.DIRECTOR,
        branchId: directorIds.branchId,
        agentId: directorIds.agentId,
        taskId: directorIds.taskId,
        createAgentWorkspace,
        prompt: directorPrompt(task),
        schema: DirectorPlanSchema,
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
            runResearchBranch(
                workspace,
                task,
                plan,
                direction,
                index,
                cycle,
                planTargets,
                available,
                cycle + index + 1,
                createAgentWorkspace,
                signal
            )
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
    let verification: Awaited<ReturnType<typeof recordVerifierEvidence>>;
    try {
        verification = await recordVerifierEvidence(
            workspace,
            verifierRun.value,
            verifierRun.result,
            verifierRun.agentWorkspace,
            verifierIds,
            planTargets,
            criticism,
            verificationEvaluator,
            criticRun.agentWorkspace,
            researcherArtifactSha256s,
            signal
        );
    } catch (error) {
        if (!signal?.aborted) {
            await failRoleTask(workspace, verifierIds, false);
        }
        throw error;
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

async function prepareDirector(workspace: LabWorkspace, cycle: number): Promise<RoleIdentifiers> {
    const initialIds = initialResearchIdentifiers(workspace.labId);
    const ids =
        cycle === 0
            ? {
                  branchId: initialIds.branchId,
                  agentId: initialIds.agentId,
                  taskId: initialIds.taskId
              }
            : roleIdentifiers(ResearchStage.DIRECTOR, cycle, 0);
    const snapshot = workspace.getSnapshot();
    if (!snapshot.branches.some(({ id }) => id === ids.branchId)) {
        await prepareRoleTask(
            workspace,
            ids,
            AgentRole.DIRECTOR,
            "Goal operationalization",
            "Turn the current frontier into independent falsifiable work"
        );
        return ids;
    }

    await workspace.update((draft) => {
        const branch = requiredById(draft.branches, ids.branchId);
        const agent = requiredById(draft.agents, ids.agentId);
        const task = requiredById(draft.tasks, ids.taskId);
        branch.status = BranchStatus.ACTIVE;
        branch.progress = BranchProgress.RUNNING;
        agent.status = AgentStatus.WORKING;
        agent.current_task_id = ids.taskId;
        task.status = InternalTaskStatus.RUNNING;
    });
    await workspace.appendEvent(EventType.TASK_STARTED, { task_id: ids.taskId });
    return ids;
}

async function prepareClaims(
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

async function freezeResearchEvaluators(
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
            candidate,
            evaluatorTarget(target)
        );
        frozen.push(evaluator);
        await recordEvaluatorPrecommit(workspace, ids, evaluator);
    }
    return frozen;
}

async function recordEvaluatorPrecommit(
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

function requiredPlanTarget(
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

function evaluatorTarget(target: PlanTarget): EvaluatorTarget {
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
    if (claim.status === ClaimStatus.PROPOSED || claim.status === ClaimStatus.REFUTED) {
        claim = transitionClaim(claim, ClaimStatus.TESTING, [], new Date().toISOString());
        const transitioned = claim;
        await workspace.update((draft) => replaceById(draft.claims, transitioned));
        await workspace.appendEvent(EventType.CLAIM_TESTING, { claim_id: claim.id });
    }
    return claim;
}

async function runResearchBranch(
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
        try {
            const precommit = await runStructuredAgent({
                workspace,
                harness,
                stage: ResearchStage.RESEARCHER,
                branchId: ids.branchId,
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
                taskId: ids.taskId,
                agentWorkspace: outcomeWorkspace,
                prompt: researcherPrompt(task, plan, direction, frozenEvaluators),
                schema: ResearchResultSchema,
                ...(signal === undefined ? {} : { signal })
            });
            const capabilityRequests = await persistAgentCapabilityRequests(
                workspace,
                run.value.capability_requests
            );
            const recorded = await recordResearchEvidence(
                workspace,
                run.value,
                ids,
                ids.branchId,
                outcomeWorkspace,
                evaluatorWorkspace,
                planTargets,
                frozenEvaluators,
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
                issues: [...issues, ...recorded.issues]
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
                await workspace.requestCapability(error.capabilityRequest);
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

async function recordResearchEvidence(
    workspace: LabWorkspace,
    result: ResearchResult,
    ids: RoleIdentifiers,
    branchId: string,
    outcomeWorkspace: ResearchWorkspace,
    evaluatorWorkspace: ResearchWorkspace,
    planTargets: readonly PlanTarget[],
    frozenEvaluators: readonly FrozenEvaluator[],
    signal?: AbortSignal
): Promise<{
    result: ResearchResult;
    evidence: MaterialEvidence[];
    artifactSha256s: string[];
    issues: string[];
}> {
    const evidence: MaterialEvidence[] = [];
    const artifactSha256s: string[] = [];
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
        const validatedArtifacts: ValidatedArtifact[] = [];
        for (const artifactPath of item.artifact_paths) {
            try {
                const artifact = await validateFileArtifact(outcomeWorkspace.cwd, artifactPath);
                const rawArtifact: Evidence = {
                    id: `evidence-${randomUUID()}`,
                    kind: EvidenceKind.ARTIFACT,
                    claim_id: planTarget.claim.id,
                    artifact_path: artifact.path,
                    artifact_hash: artifact.sha256,
                    summary: item.summary,
                    supports: false,
                    independent: true,
                    created_at: new Date().toISOString()
                };
                await workspace.recordEvidence(rawArtifact);
                await workspace.appendEvent(EventType.EVIDENCE_RECORDED, {
                    evidence_id: rawArtifact.id,
                    claim_id: rawArtifact.claim_id,
                    artifact_path: rawArtifact.artifact_path,
                    artifact_sha256: rawArtifact.artifact_hash,
                    attested_support: false
                });
                if (artifact.bytes > 0) {
                    validatedArtifacts.push(artifact);
                } else {
                    issues.push(`Rejected empty artifact ${artifactPath}`);
                }
            } catch (error) {
                issues.push(
                    `Rejected artifact ${artifactPath}: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
        if (validatedArtifacts.length === 0) {
            issues.push(
                `${item.target_kind} ${item.target_index} has no non-empty contained artifact`
            );
            continue;
        }
        artifactSha256s.push(...validatedArtifacts.map(({ sha256 }) => sha256));

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
            evaluatorWorkspace,
            outcomeWorkspace,
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
                evaluatorWorkspace,
                outcomeWorkspace,
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
            run_id: evaluation.experimentId,
            artifact_path: evaluation.result.manifest.path,
            artifact_hash: evaluation.result.manifest.sha256,
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
                evaluation.result.manifest.path
            ]
        });
    }
    return {
        result: { ...result, evidence: normalizedEvidence },
        evidence,
        artifactSha256s: uniqueStrings(artifactSha256s),
        issues
    };
}

async function promoteClaimsFromMaterialEvidence(
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

async function recordVerifierEvidence(
    workspace: LabWorkspace,
    verdict: ReturnType<typeof VerifierResultSchema.parse>,
    harnessRun: HarnessRunResult,
    verifierWorkspace: ResearchWorkspace,
    verifierIds: RoleIdentifiers,
    planTargets: readonly PlanTarget[],
    criticism: CriticResult,
    verificationEvaluator: FrozenEvaluator,
    evaluatorWorkspace: ResearchWorkspace,
    researcherArtifactSha256s: readonly string[],
    signal?: AbortSignal
): Promise<{ accepted: boolean; completed: boolean; issues: string[] }> {
    const issues: string[] = [];
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
    const validatedArtifacts: ValidatedArtifact[] = [];
    for (const artifactPath of verdict.evidence_artifact_paths) {
        try {
            const artifact = await validateFileArtifact(verifierWorkspace.cwd, artifactPath);
            if (artifact.bytes === 0) {
                issues.push(`Rejected empty verifier artifact ${artifactPath}`);
            } else if (researcherArtifactSha256s.includes(artifact.sha256)) {
                issues.push(
                    `Rejected verifier artifact copied from a research branch: ${artifactPath}`
                );
            } else {
                validatedArtifacts.push(artifact);
            }
        } catch (error) {
            issues.push(
                `Rejected verifier artifact ${artifactPath}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
    let evaluatorResult: ExecutionResult | undefined;
    let accepted = false;
    if (validatedArtifacts.length > 0) {
        try {
            const evaluation = await executeAttestedEvaluator(
                workspace,
                verifierIds,
                evaluatorWorkspace,
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
                    evaluatorWorkspace,
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
                run_id: harnessRun.sessionId ?? verifierIds.taskId,
                artifact_path: evaluatorResult.manifest.path,
                artifact_hash: evaluatorResult.manifest.sha256,
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
                complete: evaluatorResult.manifest.bytes > 0,
                reproducible: true
            });
            for (const artifact of validatedArtifacts) {
                const evidence: Evidence = {
                    id: `evidence-${randomUUID()}`,
                    kind: EvidenceKind.ARTIFACT,
                    claim_id: planClaim.claim.id,
                    run_id: harnessRun.sessionId ?? verifierIds.taskId,
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
    verdict: ReturnType<typeof VerifierResultSchema.parse>["verdict"]
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

async function markDependentClaimsStale(
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

async function assertCleanOutcomeWorkspace(workspace: ResearchWorkspace): Promise<void> {
    const unexpectedEntries = (await readdir(workspace.cwd)).filter(
        (entry) => entry !== CleanWorkspaceEntry.GIT
    );
    if (unexpectedEntries.length > 0) {
        throw new Error(
            `Research outcome workspace is not clean: ${unexpectedEntries.sort().join(", ")}`
        );
    }
}

async function assertEvaluatorRejectsNegativeControl(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    evaluatorWorkspace: ResearchWorkspace,
    executionWorkspace: ResearchWorkspace,
    claim: Claim,
    frozenEvaluator: FrozenEvaluator,
    inputArtifacts: readonly ValidatedArtifact[],
    signal?: AbortSignal
): Promise<void> {
    const controls = await createNegativeControlArtifacts(executionWorkspace, inputArtifacts);
    const evaluation = await executeAttestedEvaluator(
        workspace,
        ids,
        evaluatorWorkspace,
        executionWorkspace,
        claim,
        ExperimentEvaluator.NEGATIVE_CONTROL,
        frozenEvaluator,
        controls,
        signal
    );
    if (evaluation.verdict.verdict === EVALUATOR_VERDICT.SUPPORTS) {
        throw new Error("Evaluator also supports daemon-owned negative-control artifacts");
    }
}

async function createNegativeControlArtifacts(
    workspace: ResearchWorkspace,
    inputArtifacts: readonly ValidatedArtifact[]
): Promise<ValidatedArtifact[]> {
    const controlDirectory = path.join(
        workspace.cwd,
        ".lab-evaluator-controls",
        `control-${randomUUID()}`
    );
    await mkdir(controlDirectory, { recursive: true });
    return Promise.all(
        inputArtifacts.map(async (artifact, index) => {
            const extension = path.extname(artifact.path);
            const controlPath = path.join(
                controlDirectory,
                `artifact-${String(index).padStart(3, "0")}${extension}`
            );
            await writeFile(controlPath, await negativeControlContent(artifact.path), {
                flag: "wx"
            });
            return validateFileArtifact(workspace.cwd, controlPath);
        })
    );
}

async function negativeControlContent(artifactPath: string): Promise<string> {
    const source = await readFile(artifactPath, "utf8");
    try {
        return `${JSON.stringify(emptyJsonValue(JSON.parse(source)), null, 4)}\n`;
    } catch {
        return "";
    }
}

function emptyJsonValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return [];
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(Object.keys(value).map((key) => [key, null]));
    }
    if (typeof value === "string") {
        return "";
    }
    if (typeof value === "boolean") {
        return false;
    }
    return null;
}

async function executeAttestedEvaluator(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    evaluatorWorkspace: ResearchWorkspace,
    executionWorkspace: ResearchWorkspace,
    claim: Claim,
    evaluator: string,
    frozenEvaluator: FrozenEvaluator,
    inputArtifacts: readonly ValidatedArtifact[],
    signal?: AbortSignal
): Promise<{
    result: ExecutionResult;
    experimentId: string;
    verdict: EvaluatorStructuredVerdict;
}> {
    await assertEvaluatorUnchanged(evaluatorWorkspace.cwd, frozenEvaluator);
    const evaluatorInput = bindEvaluatorInput(frozenEvaluator, inputArtifacts);
    const experimentId = `experiment-${randomUUID()}`;
    const artifactDirectory = path.join(
        executionWorkspace.cwd,
        ".lab-evaluator",
        `run-${randomUUID()}`
    );
    const startedAt = new Date().toISOString();
    await workspace.update((draft) => {
        draft.experiments.push({
            id: experimentId,
            task_id: ids.taskId,
            branch_id: ids.branchId,
            hypothesis: claim.statement,
            evaluator,
            command: renderCommand(frozenEvaluator.file, frozenEvaluator.args),
            cwd: executionWorkspace.cwd,
            status: ExperimentStatus.RUNNING,
            started_at: startedAt
        });
    });
    await workspace.appendEvent(EventType.EXPERIMENT_PLANNED, { experiment_id: experimentId });
    await workspace.appendEvent(EventType.EXPERIMENT_STARTED, { experiment_id: experimentId });
    await workspace.appendEvent(EventType.ATTEMPT_PLANNED, { attempt_id: experimentId });
    await workspace.appendEvent(EventType.ATTEMPT_STARTED, { attempt_id: experimentId });

    const result = await runExperiment(
        {
            file: frozenEvaluator.file,
            args: frozenEvaluator.args,
            cwd: executionWorkspace.cwd,
            artifactDirectory,
            timeoutMs: VERIFIER_EVALUATOR_TIMEOUT_MS,
            env: sanitizeHarnessEnvironment(),
            inheritEnvironment: false,
            input: evaluatorInput.serialized
        },
        signal
    );
    let status = protocolExperimentStatus(result.status);
    let verdict: EvaluatorStructuredVerdict | undefined;
    let validationError: unknown;
    if (status === ExperimentStatus.SUCCEEDED) {
        try {
            verdict = await validateEvaluatorVerdict(result, frozenEvaluator, evaluatorInput);
        } catch (error) {
            status = ExperimentStatus.FAILED;
            validationError = error;
        }
    }
    await workspace.update((draft) => {
        const experiment = requiredById(draft.experiments, experimentId);
        experiment.status = status;
        experiment.exit_code = result.exitCode;
        experiment.finished_at = result.finishedAt;
        experiment.output_path = result.manifest.path;
        experiment.output_hash = result.manifest.sha256;
    });
    const failurePayload =
        validationError === undefined
            ? {}
            : {
                  validation_error:
                      validationError instanceof Error
                          ? validationError.message
                          : String(validationError)
              };
    await workspace.appendEvent(experimentEventType(status), {
        experiment_id: experimentId,
        ...failurePayload
    });
    await workspace.appendEvent(attemptEventType(status), {
        attempt_id: experimentId,
        ...failurePayload
    });
    if (validationError !== undefined) {
        throw validationError;
    }
    if (verdict === undefined) {
        throw new Error(`Daemon-attested evaluator ended with ${result.status}`);
    }
    return { result, experimentId, verdict };
}

async function prepareRoleTask(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    role: (typeof AgentRole)[keyof typeof AgentRole],
    title: string,
    objective: string
): Promise<void> {
    await workspace.update((draft) => {
        draft.branches.push({
            id: ids.branchId,
            title,
            approach: objective,
            status: BranchStatus.ACTIVE,
            progress: BranchProgress.RUNNING
        });
        draft.agents.push({
            id: ids.agentId,
            branch_id: ids.branchId,
            role,
            status: AgentStatus.WORKING,
            current_task_id: ids.taskId
        });
        draft.tasks.push({
            id: ids.taskId,
            branch_id: ids.branchId,
            objective,
            context_refs: [],
            status: InternalTaskStatus.RUNNING,
            attempt: 1,
            role
        });
    });
    await workspace.appendEvent(EventType.BRANCH_CREATED, { branch_id: ids.branchId });
    await workspace.appendEvent(EventType.TASK_QUEUED, { task_id: ids.taskId });
    await workspace.appendEvent(EventType.TASK_STARTED, { task_id: ids.taskId });
}

async function finishRoleTask(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    branchStatus: typeof BranchStatus.CLOSED | typeof BranchStatus.PAUSED
): Promise<void> {
    await workspace.update((draft) => {
        const branch = requiredById(draft.branches, ids.branchId);
        const agent = requiredById(draft.agents, ids.agentId);
        const task = requiredById(draft.tasks, ids.taskId);
        branch.status = branchStatus;
        branch.progress = BranchProgress.FINISHED;
        agent.status = AgentStatus.IDLE;
        delete agent.current_task_id;
        task.status = InternalTaskStatus.SUCCEEDED;
    });
    await workspace.appendEvent(EventType.TASK_SUCCEEDED, { task_id: ids.taskId });
    await workspace.appendEvent(
        branchStatus === BranchStatus.CLOSED ? EventType.BRANCH_CLOSED : EventType.BRANCH_PAUSED,
        { branch_id: ids.branchId }
    );
}

async function pauseRoleForCapabilities(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    capabilityRequests: readonly CapabilityRequest[]
): Promise<void> {
    const capabilityRequestIds = capabilityRequests.map(({ id }) => id);
    await workspace.update((draft) => {
        const branch = requiredById(draft.branches, ids.branchId);
        const agent = requiredById(draft.agents, ids.agentId);
        const task = requiredById(draft.tasks, ids.taskId);
        branch.status = BranchStatus.PAUSED;
        branch.progress = BranchProgress.CAPABILITY_BLOCKED;
        agent.status = AgentStatus.BLOCKED;
        agent.current_task_id = ids.taskId;
        task.status = InternalTaskStatus.QUEUED;
        task.context_refs = uniqueStrings([...task.context_refs, ...capabilityRequestIds]);
    });
    await workspace.appendEvent(EventType.TASK_QUEUED, {
        task_id: ids.taskId,
        capability_request_ids: capabilityRequestIds
    });
    await workspace.appendEvent(EventType.BRANCH_PAUSED, {
        branch_id: ids.branchId,
        capability_request_ids: capabilityRequestIds
    });
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

async function failRoleTask(
    workspace: LabWorkspace,
    ids: RoleIdentifiers,
    cancelled: boolean
): Promise<void> {
    await workspace.update((draft) => {
        const branch = requiredById(draft.branches, ids.branchId);
        const agent = requiredById(draft.agents, ids.agentId);
        const task = requiredById(draft.tasks, ids.taskId);
        branch.status = BranchStatus.PAUSED;
        branch.progress = cancelled ? BranchProgress.CANCELLED : BranchProgress.FAILED;
        agent.status = cancelled ? AgentStatus.STOPPED : AgentStatus.BLOCKED;
        delete agent.current_task_id;
        task.status = cancelled ? InternalTaskStatus.CANCELLED : InternalTaskStatus.FAILED;
    });
    await workspace.appendEvent(cancelled ? EventType.TASK_CANCELLED : EventType.TASK_FAILED, {
        task_id: ids.taskId
    });
    await workspace.appendEvent(EventType.BRANCH_PAUSED, { branch_id: ids.branchId });
}

async function updateFrontier(
    workspace: LabWorkspace,
    known: readonly string[],
    nextExperiments: readonly string[],
    blockers: readonly string[]
): Promise<void> {
    await workspace.update((draft) => {
        draft.frontier.known = uniqueStrings([...draft.frontier.known, ...known]);
        draft.frontier.open_questions = uniqueStrings([
            ...draft.claims
                .filter(
                    ({ status }) =>
                        status === ClaimStatus.PROPOSED || status === ClaimStatus.TESTING
                )
                .map(({ statement }) => statement)
        ]);
        draft.frontier.blockers = uniqueStrings([
            ...draft.frontier.blockers,
            ...blockers.filter((blocker) => blocker.trim().length > 0)
        ]);
        draft.frontier.next_experiments = uniqueStrings(nextExperiments);
    });
    await workspace.appendEvent(EventType.FRONTIER_UPDATED, {
        next_experiments: nextExperiments.length,
        blockers: blockers.length
    });
}

async function waitForConfirmedPlateau(
    workspace: LabWorkspace,
    observedSince: Date,
    progressDates: readonly Date[],
    inactivityThresholdMs: number,
    wait: (milliseconds: number, signal?: AbortSignal) => Promise<void>,
    signal?: AbortSignal
): Promise<boolean> {
    const initial = plateauAssessment(
        workspace,
        observedSince,
        progressDates,
        inactivityThresholdMs
    );
    if (initial.plateau) {
        return true;
    }
    const snapshot = workspace.getSnapshot();
    const hasInformativeWork = snapshot.frontier.next_experiments.length > 0;
    const hasActiveBranches = snapshot.branches.some(
        ({ status }) => status === BranchStatus.ACTIVE
    );
    if (hasInformativeWork || hasActiveBranches) {
        return false;
    }
    const latestActivity = initial.latestProgressAt ?? observedSince;
    const remaining = Math.max(1, inactivityThresholdMs - (Date.now() - latestActivity.getTime()));
    await wait(remaining, signal);
    return plateauAssessment(workspace, observedSince, progressDates, inactivityThresholdMs)
        .plateau;
}

function plateauAssessment(
    workspace: LabWorkspace,
    observedSince: Date,
    progressDates: readonly Date[],
    inactivityThresholdMs: number
) {
    const snapshot = workspace.getSnapshot();
    const assumptionIds = new Set(snapshot.claims.flatMap(({ assumption_ids }) => assumption_ids));
    const frontierClaim = (claim: Claim) => ({
        id: claim.id,
        statement: claim.statement,
        status: claim.status,
        stale: claim.stale
    });
    const frontier: ResearchFrontier = {
        observedSince,
        known: snapshot.frontier.known,
        claims: snapshot.claims.filter(({ id }) => !assumptionIds.has(id)).map(frontierClaim),
        assumptions: snapshot.claims.filter(({ id }) => assumptionIds.has(id)).map(frontierClaim),
        branches: snapshot.branches.map((branch) => ({
            id: branch.id,
            objective: branch.title,
            active: branch.status === BranchStatus.ACTIVE,
            lane: SchedulerLane.EXPLORATION
        })),
        blockers: snapshot.frontier.blockers.map((description, index) => ({
            id: `blocker-${index}`,
            description
        })),
        nextExperiments: snapshot.frontier.next_experiments.map((objective, index) => ({
            taskId: `frontier-task-${index}`,
            objective,
            informationValue: 1,
            lane: SchedulerLane.EXPLORATION
        })),
        progress: progressDates.map((occurredAt, index) => ({
            id: `progress-${index}`,
            kind: ProgressKind.EVIDENCE,
            summary: "Material research progress",
            occurredAt
        }))
    };
    return assessPlateau(frontier, new Date(), inactivityThresholdMs);
}

async function reconcileInterruptedWork(workspace: LabWorkspace): Promise<void> {
    const interruptedTaskIds: string[] = [];
    const interruptedExperimentIds: string[] = [];
    await workspace.update((draft) => {
        for (const task of draft.tasks) {
            if (
                task.status === InternalTaskStatus.RUNNING ||
                task.status === InternalTaskStatus.LEASED
            ) {
                task.status = InternalTaskStatus.CANCELLED;
                interruptedTaskIds.push(task.id);
            }
        }
        for (const experiment of draft.experiments) {
            if (experiment.status === ExperimentStatus.RUNNING) {
                experiment.status = ExperimentStatus.CANCELLED;
                experiment.finished_at = new Date().toISOString();
                interruptedExperimentIds.push(experiment.id);
            }
        }
        for (const agent of draft.agents) {
            if (agent.status === AgentStatus.WORKING) {
                agent.status = AgentStatus.STOPPED;
                delete agent.current_task_id;
            }
        }
        for (const branch of draft.branches) {
            if (branch.status === BranchStatus.ACTIVE) {
                branch.status = BranchStatus.PAUSED;
                branch.progress = BranchProgress.CANCELLED;
            }
        }
    });
    await Promise.all([
        ...interruptedTaskIds.map((taskId) =>
            workspace.appendEvent(EventType.TASK_CANCELLED, {
                task_id: taskId,
                recovered_interruption: true
            })
        ),
        ...interruptedExperimentIds.flatMap((experimentId) => [
            workspace.appendEvent(EventType.EXPERIMENT_CANCELLED, {
                experiment_id: experimentId,
                recovered_interruption: true
            }),
            workspace.appendEvent(EventType.ATTEMPT_CANCELLED, {
                attempt_id: experimentId,
                recovered_interruption: true
            })
        ])
    ]);
}

async function cancelActiveWork(workspace: LabWorkspace): Promise<void> {
    const cancelledTaskIds: string[] = [];
    const cancelledExperimentIds: string[] = [];
    await workspace.update((draft) => {
        for (const task of draft.tasks) {
            if (
                task.status === InternalTaskStatus.RUNNING ||
                task.status === InternalTaskStatus.LEASED
            ) {
                task.status = InternalTaskStatus.CANCELLED;
                cancelledTaskIds.push(task.id);
            }
        }
        for (const experiment of draft.experiments) {
            if (experiment.status === ExperimentStatus.RUNNING) {
                experiment.status = ExperimentStatus.CANCELLED;
                experiment.finished_at = new Date().toISOString();
                cancelledExperimentIds.push(experiment.id);
            }
        }
        for (const agent of draft.agents) {
            if (agent.status === AgentStatus.WORKING) {
                agent.status = AgentStatus.STOPPED;
                delete agent.current_task_id;
            }
        }
        for (const branch of draft.branches) {
            if (branch.status === BranchStatus.ACTIVE) {
                branch.status = BranchStatus.PAUSED;
                branch.progress = BranchProgress.CANCELLED;
            }
        }
    });
    await Promise.all([
        ...cancelledTaskIds.map((taskId) =>
            workspace.appendEvent(EventType.TASK_CANCELLED, { task_id: taskId })
        ),
        ...cancelledExperimentIds.map((experimentId) =>
            workspace.appendEvent(EventType.EXPERIMENT_CANCELLED, {
                experiment_id: experimentId
            })
        )
    ]);
}

function taskForCycle(task: TaskInput, workspace: LabWorkspace, cycle: number): TaskInput {
    const snapshot = workspace.getSnapshot();
    const capabilityContext = snapshot.capability_requests
        .filter(({ status }) => status === CapabilityStatus.PROVIDED)
        .sort(
            (left, right) =>
                requiredProvidedAt(left).localeCompare(requiredProvidedAt(right)) ||
                left.id.localeCompare(right.id)
        )
        .map(providedCapabilityContext);
    const frontierContext =
        cycle === 0
            ? []
            : [
                  ...snapshot.frontier.known,
                  ...snapshot.frontier.open_questions.map((question) =>
                      JSON.stringify({
                          type: ResearchContextEntryType.OPEN_QUESTION,
                          question
                      })
                  ),
                  ...snapshot.frontier.blockers.map((blocker) =>
                      JSON.stringify({
                          type: ResearchContextEntryType.BLOCKER,
                          blocker
                      })
                  ),
                  ...snapshot.claims.filter(isOpenClaim).map((claim) =>
                      JSON.stringify({
                          type: ResearchContextEntryType.OPEN_CLAIM,
                          claim_id: claim.id,
                          statement: claim.statement,
                          status: claim.status
                      })
                  ),
                  ...snapshot.frontier.next_experiments.map(
                      (experiment) => `${ResearchContextPrefix.NEXT_EXPERIMENT} ${experiment}`
                  )
              ];
    return {
        ...task,
        context: uniqueStrings([...task.context, ...capabilityContext, ...frontierContext])
    };
}

function isOpenClaim(claim: Claim): boolean {
    return (
        claim.status === ClaimStatus.PROPOSED ||
        claim.status === ClaimStatus.TESTING ||
        claim.status === ClaimStatus.SUPPORTED
    );
}

function providedCapabilityContext(request: CapabilityRequest): string {
    return JSON.stringify({
        type: ResearchContextEntryType.PROVIDED_CAPABILITY,
        resource_reference: requiredResourceReference(request),
        provided_at: requiredProvidedAt(request)
    });
}

function requiredResourceReference(request: CapabilityRequest): string {
    if (request.resource_reference === undefined) {
        throw new Error(`Provided capability ${request.id} has no resource reference`);
    }
    return request.resource_reference;
}

function requiredProvidedAt(request: CapabilityRequest): string {
    if (request.provided_at === undefined) {
        throw new Error(`Provided capability ${request.id} has no provided timestamp`);
    }
    return request.provided_at;
}

function roleIdentifiers(stage: ResearchStage, cycle: number, ordinal: number): RoleIdentifiers {
    const suffix = `${cycle}-${ordinal}-${randomUUID()}`;
    return {
        branchId: `branch-${stage}-${suffix}`,
        agentId: `agent-${stage}-${suffix}`,
        taskId: `task-${stage}-${suffix}`
    };
}

function selectHarness(available: readonly AvailableHarness[], index: number): AvailableHarness {
    const selected = available[index % available.length];
    if (selected === undefined) {
        throw new Error("No subscription-authenticated harness is available");
    }
    return selected;
}

function preferredDifferentHarnessIndex(
    available: readonly AvailableHarness[],
    criticHarness: AgentHarness
): number {
    const index = available.findIndex(({ harness }) => harness.kind !== criticHarness.kind);
    return index < 0 ? 0 : index;
}

async function runCriticStageWithFallback(input: {
    readonly workspace: LabWorkspace;
    readonly available: readonly AvailableHarness[];
    readonly preferredIndex: number;
    readonly ids: RoleIdentifiers;
    readonly createAgentWorkspace: CreateResearchWorkspace;
    readonly prompt: string;
    readonly planTargets: readonly PlanTarget[];
    readonly researcherEvaluatorIdentities: readonly string[];
    readonly signal?: AbortSignal;
}): Promise<CriticStageRunOutput> {
    let lastError: unknown;
    let capabilityFailures = 0;
    for (let offset = 0; offset < input.available.length; offset += 1) {
        throwIfAborted(input.signal);
        const harness = selectHarness(input.available, input.preferredIndex + offset).harness;
        const agentWorkspace = await input.createAgentWorkspace(ResearchStage.CRITIC);
        try {
            const run = await runStructuredAgent({
                workspace: input.workspace,
                harness,
                stage: ResearchStage.CRITIC,
                branchId: input.ids.branchId,
                taskId: input.ids.taskId,
                agentWorkspace,
                prompt: input.prompt,
                schema: CriticResultSchema,
                ...(input.signal === undefined ? {} : { signal: input.signal })
            });
            await persistAgentCapabilityRequests(input.workspace, run.value.capability_requests);
            const target = requiredPlanTarget(
                input.planTargets,
                run.value.verification_evaluator.target_kind,
                run.value.verification_evaluator.target_index
            );
            if (target.kind !== RESEARCH_TARGET_KIND.CLAIM) {
                throw new Error("Independent verification evaluator must target a claim");
            }
            const evaluator = await freezeEvaluator(
                agentWorkspace.cwd,
                run.value.verification_evaluator,
                evaluatorTarget(target)
            );
            if (input.researcherEvaluatorIdentities.includes(evaluator.semanticIdentitySha256)) {
                throw new Error(
                    "Independent verification must use a semantically alternate evaluator"
                );
            }
            await recordEvaluatorPrecommit(input.workspace, input.ids, evaluator);
            return { ...run, harness, agentWorkspace, evaluator };
        } catch (error) {
            lastError = error;
            if (input.signal?.aborted) {
                await failRoleTask(input.workspace, input.ids, true);
                throw error;
            }
            if (error instanceof HarnessCapabilityError) {
                capabilityFailures += 1;
                await input.workspace.requestCapability(error.capabilityRequest);
            }
        }
    }
    if (capabilityFailures === input.available.length) {
        throw new StageCapabilityBlockedError(ResearchStage.CRITIC);
    }
    await failRoleTask(input.workspace, input.ids, false);
    throw lastError ?? new Error("All critic evaluator precommit attempts failed");
}

async function runStageWithFallback<Output extends AgentCapabilityOutput>(input: {
    readonly workspace: LabWorkspace;
    readonly available: readonly AvailableHarness[];
    readonly preferredIndex: number;
    readonly stage: ResearchStage;
    readonly branchId: string;
    readonly agentId: string;
    readonly taskId: string;
    readonly createAgentWorkspace: CreateResearchWorkspace;
    readonly prompt: string;
    readonly schema: z.ZodType<Output>;
    readonly signal?: AbortSignal;
}): Promise<StageRunOutput<Output>> {
    let lastError: unknown;
    let capabilityFailures = 0;
    for (let offset = 0; offset < input.available.length; offset += 1) {
        throwIfAborted(input.signal);
        const harness = selectHarness(input.available, input.preferredIndex + offset).harness;
        const agentWorkspace = await input.createAgentWorkspace(input.stage);
        try {
            const run = await runStructuredAgent({
                workspace: input.workspace,
                harness,
                stage: input.stage,
                branchId: input.branchId,
                taskId: input.taskId,
                agentWorkspace,
                prompt: input.prompt,
                schema: input.schema,
                ...(input.signal === undefined ? {} : { signal: input.signal })
            });
            await persistAgentCapabilityRequests(input.workspace, run.value.capability_requests);
            return { ...run, harness, agentWorkspace };
        } catch (error) {
            lastError = error;
            if (input.signal?.aborted) {
                await failRoleTask(
                    input.workspace,
                    {
                        branchId: input.branchId,
                        agentId: input.agentId,
                        taskId: input.taskId
                    },
                    true
                );
                throw error;
            }
            if (error instanceof HarnessCapabilityError) {
                capabilityFailures += 1;
                await input.workspace.requestCapability(error.capabilityRequest);
            }
        }
    }
    if (capabilityFailures === input.available.length) {
        throw new StageCapabilityBlockedError(input.stage);
    }
    await failRoleTask(
        input.workspace,
        {
            branchId: input.branchId,
            agentId: input.agentId,
            taskId: input.taskId
        },
        input.signal?.aborted === true
    );
    throw lastError ?? new Error("All subscription CLI harness attempts failed");
}

async function persistAgentCapabilityRequests(
    workspace: LabWorkspace,
    candidates: readonly CapabilityRequestCandidate[]
): Promise<CapabilityRequest[]> {
    const requests: CapabilityRequest[] = [];
    for (const candidate of candidates) {
        requests.push(
            await workspace.requestCapability({
                need: candidate.need,
                reason: candidate.reason,
                provisioningHint: candidate.provisioning_hint
            })
        );
    }
    return [...new Map(requests.map((request) => [request.id, request])).values()];
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

function renderHarnessCommand(run: HarnessRunResult): string {
    return renderCommand(run.command.file, run.command.args);
}

function renderCommand(file: string, args: readonly string[]): string {
    return [file, ...args].map((part) => JSON.stringify(part)).join(" ");
}

function protocolExperimentStatus(
    status: Exclude<ExecutionStatus, typeof EXECUTION_STATUS.RUNNING>
): Exclude<ExperimentStatus, typeof ExperimentStatus.PLANNED | typeof ExperimentStatus.RUNNING> {
    switch (status) {
        case EXECUTION_STATUS.SUCCEEDED:
            return ExperimentStatus.SUCCEEDED;
        case EXECUTION_STATUS.TIMED_OUT:
            return ExperimentStatus.TIMED_OUT;
        case EXECUTION_STATUS.CANCELLED:
            return ExperimentStatus.CANCELLED;
        case EXECUTION_STATUS.FAILED:
        case EXECUTION_STATUS.SPAWN_ERROR:
            return ExperimentStatus.FAILED;
    }
}

function experimentEventType(
    status: Exclude<
        ExperimentStatus,
        typeof ExperimentStatus.PLANNED | typeof ExperimentStatus.RUNNING
    >
) {
    switch (status) {
        case ExperimentStatus.SUCCEEDED:
            return EventType.EXPERIMENT_SUCCEEDED;
        case ExperimentStatus.TIMED_OUT:
            return EventType.EXPERIMENT_TIMED_OUT;
        case ExperimentStatus.CANCELLED:
            return EventType.EXPERIMENT_CANCELLED;
        case ExperimentStatus.FAILED:
            return EventType.EXPERIMENT_FAILED;
    }
}

function attemptEventType(
    status: Exclude<
        ExperimentStatus,
        typeof ExperimentStatus.PLANNED | typeof ExperimentStatus.RUNNING
    >
) {
    switch (status) {
        case ExperimentStatus.SUCCEEDED:
            return EventType.ATTEMPT_SUCCEEDED;
        case ExperimentStatus.TIMED_OUT:
            return EventType.ATTEMPT_TIMED_OUT;
        case ExperimentStatus.CANCELLED:
            return EventType.ATTEMPT_CANCELLED;
        case ExperimentStatus.FAILED:
            return EventType.ATTEMPT_FAILED;
    }
}

function requiredById<Item extends { id: string }>(items: Item[], id: string): Item {
    const item = items.find((candidate) => candidate.id === id);
    if (item === undefined) {
        throw new Error(`Workspace item not found: ${id}`);
    }
    return item;
}

function replaceById<Item extends { id: string }>(items: Item[], replacement: Item): void {
    const index = items.findIndex(({ id }) => id === replacement.id);
    if (index < 0) {
        throw new Error(`Workspace item not found: ${replacement.id}`);
    }
    items[index] = replacement;
}

function uniqueStrings(values: readonly string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw signal.reason instanceof Error ? signal.reason : new Error("Research loop cancelled");
    }
}

async function defaultPlateauWait(milliseconds: number, signal?: AbortSignal): Promise<void> {
    await delay(milliseconds, undefined, signal === undefined ? {} : { signal });
}
