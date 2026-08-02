import {
    type AgentHarness,
    type HarnessRunResult,
    HarnessRunStatuses,
    HarnessEventTypes
} from "@lab/harness/contract";
import { HarnessAbortedError } from "@lab/harness/errors";
import { EventType } from "@lab/protocol/constants";
import type { z } from "zod";
import { structuredOutputSchema } from "#src/research-contract";
import type { ResearchStage, ResearchWorkspace } from "#src/research-workspace";
import type { LabWorkspace } from "#src/workspace";

export interface StructuredAgentRunInput<Output> {
    readonly workspace: LabWorkspace;
    readonly harness: AgentHarness;
    readonly stage: ResearchStage;
    readonly branchId: string;
    readonly taskId: string;
    readonly agentWorkspace: ResearchWorkspace;
    readonly prompt: string;
    readonly schema: z.ZodType<Output>;
    readonly signal?: AbortSignal;
}

export interface StructuredAgentRunOutput<Output> {
    readonly value: Output;
    readonly result: HarnessRunResult;
}

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
    const { workspace, harness, stage, branchId, taskId, agentWorkspace, signal } = input;
    await workspace.appendEvent(EventType.HARNESS_RUN_STARTED, {
        harness: harness.kind,
        stage,
        branch_id: branchId,
        task_id: taskId,
        cwd: agentWorkspace.cwd
    });

    let completed: HarnessRunResult | undefined;
    let terminalEventRecorded = false;
    try {
        for await (const event of harness.run(
            {
                prompt: input.prompt,
                cwd: agentWorkspace.cwd,
                artifactDirectory: agentWorkspace.artifactDirectory,
                responseSchema: structuredOutputSchema(input.schema)
            },
            signal
        )) {
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
        if (!terminalEventRecorded) {
            const cancelled =
                signal?.aborted === true ||
                error instanceof HarnessAbortedError ||
                completed?.status === HarnessRunStatuses.CANCELLED;
            await workspace.appendEvent(
                cancelled ? EventType.HARNESS_RUN_CANCELLED : EventType.HARNESS_RUN_FAILED,
                {
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
                }
            );
        }
        if (error instanceof StructuredAgentRunError || completed === undefined) {
            throw error;
        }
        throw new StructuredAgentRunError(
            error instanceof Error ? error.message : String(error),
            completed,
            { cause: error }
        );
    }
}
