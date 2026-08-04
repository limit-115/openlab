import { HarnessRunStatuses } from "@lab/harness/agent-harness.const";
import type { HarnessCapabilityRequest } from "@lab/harness/harness-error";
import { HarnessAbortedError, HarnessCapabilityError } from "@lab/harness/harness-error";
import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
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
import { spentAllowanceError } from "#src/subscription-allowance/spent-allowance";

export class HarnessCapabilityBlockedError extends Error {
    constructor(role: string) {
        super(`All subscription CLI harnesses lost required capabilities during ${role} work`);
        this.name = "HarnessCapabilityBlockedError";
    }
}

/**
 * Gives one piece of work to an agent, moving down the roster when a harness cannot carry it. Each
 * attempt is journalled as its own run: a second harness taking over is a second agent doing the
 * work, and an operator reading the history should see both.
 *
 * A subscription with nothing left is passed over before any run is prepared, which is the same
 * outcome the vendor's refusal produced mid-run, reached without spending a run to find out.
 */
export async function runAgentWithFallback<Output extends AgentCapabilityOutput>(
    input: AgentDispatchInput<Output>
): Promise<AgentRunOutput<Output>> {
    let lastError: unknown;
    let capabilityFailures = 0;
    for (let offset = 0; offset < input.available.length; offset += 1) {
        throwIfAborted(input.signal);
        const harness = selectHarness(input.available, input.preferredIndex + offset).harness;
        const spent = await spentAllowanceError(input.subscriptions, harness.kind, input.signal);
        if (spent !== undefined) {
            lastError = spent;
            capabilityFailures += 1;
            await requestSubscriptionCapability(input.workspace, spent.capabilityRequest);
            continue;
        }

        const agentWorkspace = await input.createAgentWorkspace(input.role);
        const runId = newAgentRunId(input.role);
        await startAgentRun(input.workspace, {
            id: runId,
            role: input.role,
            ...(input.assumptionId === undefined ? {} : { assumptionId: input.assumptionId }),
            objective: input.objective,
            cwd: agentWorkspace.cwd
        });
        try {
            const run = await runStructuredAgent({
                workspace: input.workspace,
                activity: input.activity,
                harness,
                runId,
                ...(input.assumptionId === undefined ? {} : { assumptionId: input.assumptionId }),
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
                capabilityFailures += 1;
                await requestSubscriptionCapability(input.workspace, error.capabilityRequest);
            }
        }
    }
    if (capabilityFailures === input.available.length) {
        throw new HarnessCapabilityBlockedError(input.role);
    }
    throw lastError ?? new Error("All subscription CLI harness attempts failed");
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
