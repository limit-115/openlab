import type { HarnessExecutionProfile } from "@lab/harness/agent-harness.const";
import type { AgentHarness } from "@lab/harness/agent-harness.types";
import type { HarnessCapabilityRequest } from "@lab/harness/harness-error";
import { HarnessCapabilityError } from "@lab/harness/harness-error";
import { CapabilityResourceClass } from "@lab/protocol/capabilities/capability-request.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import type { z } from "zod";
import { freezeEvaluator } from "#src/evaluator-integrity/frozen-evaluator";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import {
    type CapabilityRequestCandidate,
    CriticResultSchema
} from "#src/research-contract/research-contract";
import { RESEARCH_TARGET_KIND } from "#src/research-contract/research-contract.const";
import { recordEvaluatorPrecommit } from "#src/research-cycle/evaluator-precommit";
import { throwIfAborted } from "#src/research-cycle/research-cancellation";
import type {
    AgentCapabilityOutput,
    AvailableHarness,
    CreateResearchWorkspace,
    CriticStageRunOutput,
    RoleIdentifiers,
    StageRunOutput
} from "#src/research-cycle/research-loop.types";
import { failRoleTask } from "#src/research-cycle/research-role-lifecycle";
import { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";
import { runStructuredAgent } from "#src/research-cycle/structured-agent-run";
import { evaluatorTarget, requiredPlanTarget } from "#src/research-evidence/claim-progression";
import type { PlanTarget } from "#src/research-evidence/research-evidence.types";

export class StageCapabilityBlockedError extends Error {
    constructor(stage: ResearchStage) {
        super(`All subscription CLI harnesses lost required capabilities during ${stage}`);
        this.name = "StageCapabilityBlockedError";
    }
}

export async function preflightHarnesses(
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
                    await requestSubscriptionCapability(workspace, error.capabilityRequest);
                }
                return undefined;
            }
        })
    );
    return results.filter((result): result is AvailableHarness => result !== undefined);
}

export function selectHarness(
    available: readonly AvailableHarness[],
    index: number
): AvailableHarness {
    const selected = available[index % available.length];
    if (selected === undefined) {
        throw new Error("No subscription-authenticated harness is available");
    }
    return selected;
}

export function preferredDifferentHarnessIndex(
    available: readonly AvailableHarness[],
    criticHarness: AgentHarness
): number {
    const index = available.findIndex(({ harness }) => harness.kind !== criticHarness.kind);
    return index < 0 ? 0 : index;
}

export async function runCriticStageWithFallback(input: {
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
            const capabilityRequests = await persistAgentCapabilityRequests(
                input.workspace,
                run.value.capability_requests
            );
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
            return { ...run, harness, agentWorkspace, capabilityRequests, evaluator };
        } catch (error) {
            lastError = error;
            if (input.signal?.aborted) {
                await failRoleTask(input.workspace, input.ids, true);
                throw error;
            }
            if (error instanceof HarnessCapabilityError) {
                capabilityFailures += 1;
                await requestSubscriptionCapability(input.workspace, error.capabilityRequest);
            }
        }
    }
    if (capabilityFailures === input.available.length) {
        throw new StageCapabilityBlockedError(ResearchStage.CRITIC);
    }
    await failRoleTask(input.workspace, input.ids, false);
    throw lastError ?? new Error("All critic evaluator precommit attempts failed");
}

export async function runStageWithFallback<Output extends AgentCapabilityOutput>(input: {
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
    readonly executionProfile?: HarnessExecutionProfile;
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
                ...(input.executionProfile === undefined
                    ? {}
                    : { executionProfile: input.executionProfile }),
                ...(input.signal === undefined ? {} : { signal: input.signal })
            });
            const capabilityRequests = await persistAgentCapabilityRequests(
                input.workspace,
                run.value.capability_requests
            );
            return { ...run, harness, agentWorkspace, capabilityRequests };
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
                await requestSubscriptionCapability(input.workspace, error.capabilityRequest);
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

export async function persistAgentCapabilityRequests(
    workspace: LabWorkspace,
    candidates: readonly CapabilityRequestCandidate[]
): Promise<CapabilityRequest[]> {
    const requests: CapabilityRequest[] = [];
    for (const candidate of candidates) {
        requests.push(
            await workspace.requestCapability({
                need: candidate.need,
                resourceClass: candidate.resource_class,
                reason: candidate.reason,
                provisioningHint: candidate.provisioning_hint
            })
        );
    }
    return [...new Map(requests.map((request) => [request.id, request])).values()];
}

/**
 * A harness that cannot reach its product subscription is blocked on an operator-held account,
 * never on software the daemon or its agents could install.
 */
export function requestSubscriptionCapability(
    workspace: LabWorkspace,
    request: HarnessCapabilityRequest
): Promise<CapabilityRequest> {
    return workspace.requestCapability({
        need: request.need,
        resourceClass: CapabilityResourceClass.ACCOUNT,
        reason: request.reason,
        provisioningHint: request.provisioningHint
    });
}
