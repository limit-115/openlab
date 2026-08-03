import { HarnessRunStatuses } from "@lab/harness/agent-harness.const";
import type {
    AgentHarness,
    HarnessRunRequest,
    HarnessRunResult
} from "@lab/harness/agent-harness.types";
import { HarnessAbortedError, HarnessCapabilityError } from "@lab/harness/harness-error";
import { HarnessEventTypes } from "@lab/harness/harness-event.const";
import type { AgentExecution } from "@lab/protocol/agents/agent-execution.types";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import {
    SnapshotEffortLevel,
    SnapshotHarnessKind
} from "#src/research-cycle/structured-agent-run.const";
import type {
    StructuredAgentRunInput,
    StructuredAgentRunOutput
} from "#src/research-cycle/structured-agent-run.types";

export class StructuredAgentRunError extends Error {
    readonly result: HarnessRunResult | undefined;

    constructor(message: string, result?: HarnessRunResult, options?: ErrorOptions) {
        super(message, options);
        this.name = "StructuredAgentRunError";
        this.result = result;
    }
}

/**
 * Runs one agent session and hands back what it returned. The run's own lifecycle — that it started,
 * how it ended — is journalled by the caller, so this stays responsible for the harness stream and
 * the live activity plane alone.
 */
export async function runStructuredAgent<Output>(
    input: StructuredAgentRunInput<Output>
): Promise<StructuredAgentRunOutput<Output>> {
    const { workspace, activity, harness, runId, agentWorkspace, signal } = input;
    const request: HarnessRunRequest = {
        prompt: input.prompt,
        cwd: agentWorkspace.cwd,
        artifactDirectory: agentWorkspace.artifactDirectory,
        responseSchema: input.schema,
        ...(input.executionProfile === undefined
            ? {}
            : { executionProfile: input.executionProfile })
    };
    const execution = agentExecution(harness, request);
    await workspace.update((draft) => {
        requiredById(draft.runs, runId).execution = execution;
    });

    const activityRun = activity.startRun({
        run_id: runId,
        ...(input.assumptionId === undefined ? {} : { assumption_id: input.assumptionId }),
        role: agentWorkspace.role,
        execution,
        artifact_directory: agentWorkspace.artifactDirectory,
        started_at: new Date().toISOString()
    });

    let completed: HarnessRunResult | undefined;
    try {
        for await (const event of harness.run(request, signal)) {
            activityRun.publish(event);
            if (event.type === HarnessEventTypes.RUN_COMPLETED) {
                completed = event.result;
            }
        }

        if (completed === undefined) {
            throw new Error(`${harness.kind} harness ended without a completion event`);
        }
        if (completed.status === HarnessRunStatuses.CANCELLED) {
            throw new StructuredAgentRunError(
                `${harness.kind} harness run was cancelled`,
                completed,
                { cause: new HarnessAbortedError(harness.kind, { cause: signal?.reason }) }
            );
        }
        if (completed.status === HarnessRunStatuses.TIMED_OUT) {
            throw new StructuredAgentRunError(
                completed.error ?? `${harness.kind} harness run timed out`,
                completed
            );
        }
        if (completed.status === HarnessRunStatuses.FAILED) {
            throw new StructuredAgentRunError(
                completed.error ?? `${harness.kind} harness run failed`,
                completed
            );
        }

        return { value: input.schema.parse(completed.structuredOutput), result: completed };
    } catch (error) {
        activityRun.abandon(error instanceof Error ? error.message : String(error));
        if (
            error instanceof StructuredAgentRunError ||
            error instanceof HarnessCapabilityError ||
            completed === undefined
        ) {
            throw error;
        }
        throw new StructuredAgentRunError(
            error instanceof Error ? error.message : String(error),
            completed,
            { cause: error }
        );
    }
}

function agentExecution(harness: AgentHarness, request: HarnessRunRequest): AgentExecution {
    const session = harness.resolveSession(request);
    return {
        harness: SnapshotHarnessKind[harness.kind],
        model: session.model,
        effort: SnapshotEffortLevel[session.effort]
    };
}
