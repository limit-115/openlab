import { basename } from "node:path";
import { HarnessRunStatuses } from "@lab/harness/agent-harness.const";
import type {
    AgentHarness,
    HarnessRunRequest,
    HarnessRunResult
} from "@lab/harness/agent-harness.types";
import { HarnessAbortedError, HarnessCapabilityError } from "@lab/harness/harness-error";
import { HarnessEventTypes } from "@lab/harness/harness-event.const";
import type { AgentExecution } from "@lab/protocol/agents/agent-execution.types";
import { EventType } from "@lab/protocol/lab-events/event-type.const";
import { requiredById } from "#src/lab-workspace/snapshot-entities";
import {
    SnapshotAgentRole,
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

export async function runStructuredAgent<Output>(
    input: StructuredAgentRunInput<Output>
): Promise<StructuredAgentRunOutput<Output>> {
    const {
        workspace,
        activity,
        harness,
        stage,
        branchId,
        agentId,
        taskId,
        agentWorkspace,
        signal
    } = input;
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
    await workspace.mutateWithEvent(
        EventType.HARNESS_RUN_STARTED,
        {
            harness: execution.harness,
            model: execution.model,
            effort: execution.effort,
            stage,
            branch_id: branchId,
            task_id: taskId,
            cwd: agentWorkspace.cwd
        },
        (draft) => {
            requiredById(draft.agents, agentId).execution = execution;
        }
    );

    const activityRun = activity.startRun({
        agent_id: agentId,
        run_id: basename(agentWorkspace.artifactDirectory),
        branch_id: branchId,
        task_id: taskId,
        role: SnapshotAgentRole[stage],
        execution,
        artifact_directory: agentWorkspace.artifactDirectory,
        started_at: new Date().toISOString()
    });

    let completed: HarnessRunResult | undefined;
    let terminalEventRecorded = false;
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

        const value = input.schema.parse(completed.structuredOutput);
        await workspace.appendEvent(EventType.HARNESS_RUN_SUCCEEDED, {
            harness: harness.kind,
            stage,
            branch_id: branchId,
            task_id: taskId,
            session_id: completed.sessionId,
            manifest_path: completed.artifacts.manifest.path,
            manifest_sha256: completed.artifacts.manifest.sha256
        });
        terminalEventRecorded = true;
        return { value, result: completed };
    } catch (error) {
        activityRun.abandon(error instanceof Error ? error.message : String(error));
        if (!terminalEventRecorded) {
            const cancelled =
                signal?.aborted === true ||
                error instanceof HarnessAbortedError ||
                completed?.status === HarnessRunStatuses.CANCELLED;
            const eventType = cancelled
                ? EventType.HARNESS_RUN_CANCELLED
                : completed?.status === HarnessRunStatuses.TIMED_OUT
                  ? EventType.HARNESS_RUN_TIMED_OUT
                  : EventType.HARNESS_RUN_FAILED;
            await workspace.appendEvent(eventType, {
                harness: harness.kind,
                stage,
                branch_id: branchId,
                task_id: taskId,
                session_id: completed?.sessionId ?? null,
                error: error instanceof Error ? error.message : String(error),
                ...(completed === undefined
                    ? {}
                    : {
                          manifest_path: completed.artifacts.manifest.path,
                          manifest_sha256: completed.artifacts.manifest.sha256
                      })
            });
        }
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
