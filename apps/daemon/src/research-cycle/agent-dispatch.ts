import { HarnessRunStatuses } from "@openlab/harness/agent-harness.const";
import type { HarnessCapabilityRequest } from "@openlab/harness/harness-error";
import { HarnessAbortedError, HarnessCapabilityError } from "@openlab/harness/harness-error";
import { AgentRunStatus } from "@openlab/protocol/agent-runs/agent-run-status.const";
import type { CapabilityRequest } from "@openlab/protocol/capabilities/capability-request.types";
import { EventType } from "@openlab/protocol/investigation-events/event-type.const";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import { resolveRoleExecution } from "#src/lab-settings/role-execution";
import type { CapabilityRequestCandidate } from "#src/research-contract/research-contract";
import {
    blockAgentRun,
    failAgentRun,
    finishAgentRun,
    newAgentRunId,
    startAgentRun
} from "#src/research-cycle/agent-run-lifecycle";
import { selectHarness } from "#src/research-cycle/harness-roster";
import { throwIfAborted } from "#src/research-cycle/research-cancellation";
import type {
    AgentCapabilityOutput,
    AgentDispatchInput,
    AgentRunOutput
} from "#src/research-cycle/research-loop.types";
import {
    runStructuredAgent,
    StructuredAgentRunError
} from "#src/research-cycle/structured-agent-run";
import {
    subscriptionBlock,
    unavailableBlock
} from "#src/subscription-allowance/subscription-block";
import type { SubscriptionBlock } from "#src/subscription-allowance/subscription-block.types";

/**
 * Nothing this investigation may dispatch to would take the work. What stopped each subscription is
 * carried through rather than summarised away, because the investigation hibernates on it and the
 * operator reads it: a lab held by the caps it was given and one that lost its logins are different
 * problems, and only one of them is waiting on a person.
 */
export class DispatchBlockedError extends Error {
    readonly blocks: readonly SubscriptionBlock[];

    constructor(role: string, blocks: readonly SubscriptionBlock[]) {
        super(`No subscription could take the ${role} work`);
        this.name = "DispatchBlockedError";
        this.blocks = blocks;
    }
}

/**
 * Gives one piece of work to an agent, moving down the roster when a harness cannot carry it. Each
 * attempt is journalled as its own run: a second harness taking over is a second agent doing the
 * work, and an operator reading the history should see both.
 *
 * A subscription that has nothing left, or that has reached the cap the operator set on it, is
 * passed over before any run is prepared: the same outcome, reached without spending a run to find
 * out.
 */
export async function runAgentWithFallback<Output extends AgentCapabilityOutput>(
    input: AgentDispatchInput<Output>
): Promise<AgentRunOutput<Output>> {
    let lastError: unknown;
    const blocks: SubscriptionBlock[] = [];
    for (let offset = 0; offset < input.available.length; offset += 1) {
        throwIfAborted(input.signal);
        const harness = selectHarness(input.available, input.preferredIndex + offset).harness;
        const settings = input.settings.read();
        const block = await subscriptionBlock({
            ...(input.subscriptions === undefined ? {} : { readings: input.subscriptions }),
            caps: settings.spend_caps,
            kind: harness.kind,
            spendPastCaps: input.workspace.input.spend_past_caps,
            ...(input.signal === undefined ? {} : { signal: input.signal })
        });
        if (block !== undefined) {
            lastError = block.capabilityError ?? new Error(block.reason);
            blocks.push(block);
            await recordSubscriptionBlock(input.workspace, block);
            continue;
        }

        const execution = resolveRoleExecution(settings, input.role, harness.kind);
        const agentWorkspace = await input.createAgentWorkspace(input.role);
        const runId = newAgentRunId(input.role);
        await startAgentRun(input.workspace, {
            id: runId,
            role: input.role,
            ...(input.leadId === undefined ? {} : { leadId: input.leadId }),
            objective: input.objective,
            cwd: agentWorkspace.cwd
        });
        try {
            const run = await runStructuredAgent({
                workspace: input.workspace,
                activity: input.activity,
                harness,
                runId,
                ...(input.leadId === undefined ? {} : { leadId: input.leadId }),
                agentWorkspace,
                prompt: input.prompt,
                schema: input.schema,
                effort: execution.effort,
                ...(execution.model === undefined ? {} : { model: execution.model }),
                ...(input.executionProfile === undefined
                    ? {}
                    : { executionProfile: input.executionProfile }),
                ...(input.signal === undefined ? {} : { signal: input.signal })
            });
            const capabilityRequests = await persistAgentCapabilityRequests(
                input.workspace,
                run.value.capability_requests,
                run.value.capability_blocked === true
            );
            if (run.value.capability_blocked === true) {
                await blockAgentRun(input.workspace, runId, capabilityRequests);
            } else {
                await finishAgentRun(input.workspace, runId, {
                    exitCode: run.result.exitCode,
                    manifestPath: run.result.artifacts.manifest.path
                });
            }
            return { ...run, runId, harness, agentWorkspace, capabilityRequests };
        } catch (error) {
            lastError = error;
            await failAgentRun(input.workspace, runId, {
                status: failureStatus(error, input.signal),
                error: error instanceof Error ? error.message : String(error)
            });
            if (input.signal?.aborted) {
                throw error;
            }
            if (error instanceof HarnessCapabilityError) {
                blocks.push(unavailableBlock(harness.kind, error.message));
                await requestSubscriptionCapability(input.workspace, error.capabilityRequest);
            }
        }
    }
    if (blocks.length === input.available.length) {
        throw new DispatchBlockedError(input.role, blocks);
    }
    throw lastError ?? new Error("All subscription CLI harness attempts failed");
}

/**
 * Writes down that a subscription was passed over. A vendor that has stopped serving is asked
 * about, because only the operator can bring it back; a cap is the operator's own instruction, so
 * it is journalled and nothing is asked of them.
 */
async function recordSubscriptionBlock(
    workspace: InvestigationWorkspace,
    block: SubscriptionBlock
): Promise<void> {
    if (block.capabilityError !== undefined) {
        await requestSubscriptionCapability(workspace, block.capabilityError.capabilityRequest);
        return;
    }
    await workspace.appendEvent(EventType.HARNESS_WITHHELD, {
        harness: block.harness,
        reason: block.reason,
        ...(block.returnsAt === undefined ? {} : { returns_at: block.returnsAt })
    });
}

function failureStatus(
    error: unknown,
    signal?: AbortSignal
):
    | typeof AgentRunStatus.FAILED
    | typeof AgentRunStatus.TIMED_OUT
    | typeof AgentRunStatus.CANCELLED {
    if (signal?.aborted === true || error instanceof HarnessAbortedError) {
        return AgentRunStatus.CANCELLED;
    }
    if (error instanceof StructuredAgentRunError) {
        if (error.result?.status === HarnessRunStatuses.CANCELLED) {
            return AgentRunStatus.CANCELLED;
        }
        if (error.result?.status === HarnessRunStatuses.TIMED_OUT) {
            return AgentRunStatus.TIMED_OUT;
        }
    }
    return AgentRunStatus.FAILED;
}

export async function persistAgentCapabilityRequests(
    workspace: InvestigationWorkspace,
    candidates: readonly CapabilityRequestCandidate[],
    blocking: boolean
): Promise<CapabilityRequest[]> {
    const requests: CapabilityRequest[] = [];
    for (const candidate of candidates) {
        requests.push(
            await workspace.requestCapability({
                need: candidate.need,
                reason: candidate.reason,
                provisioningHint: candidate.provisioning_hint,
                selfProvisioningAttempt: candidate.self_provisioning_attempt,
                blocking
            })
        );
    }
    return [...new Map(requests.map((request) => [request.id, request])).values()];
}

/**
 * A harness that cannot reach its product subscription genuinely stops the investigation: no agent runs at
 * all until the operator restores the session, so this is the one request the daemon raises itself.
 */
export function requestSubscriptionCapability(
    workspace: InvestigationWorkspace,
    request: HarnessCapabilityRequest
): Promise<CapabilityRequest> {
    return workspace.requestCapability({
        need: request.need,
        reason: request.reason,
        provisioningHint: request.provisioningHint,
        blocking: true
    });
}
