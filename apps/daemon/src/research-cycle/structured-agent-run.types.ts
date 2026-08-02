import type { HarnessExecutionProfile } from "@lab/harness/agent-harness.const";
import type { AgentHarness, HarnessRunResult } from "@lab/harness/agent-harness.types";
import type { z } from "zod";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";
import type { ResearchWorkspace } from "#src/research-cycle/research-stage-workspace.types";

export interface StructuredAgentRunInput<Output> {
    readonly workspace: LabWorkspace;
    readonly harness: AgentHarness;
    readonly stage: ResearchStage;
    readonly branchId: string;
    readonly agentId: string;
    readonly taskId: string;
    readonly agentWorkspace: ResearchWorkspace;
    readonly prompt: string;
    readonly schema: z.ZodType<Output>;
    readonly signal?: AbortSignal;
    readonly executionProfile?: HarnessExecutionProfile;
}

export interface StructuredAgentRunOutput<Output> {
    readonly value: Output;
    readonly result: HarnessRunResult;
}
