import type { HarnessExecutionProfile } from "@lab/harness/agent-harness.const";
import type { AgentHarness, HarnessRunResult } from "@lab/harness/agent-harness.types";
import type { z } from "zod";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type { AgentWorkspace } from "#src/research-cycle/agent-workspace.types";

export interface StructuredAgentRunInput<Output> {
    readonly workspace: LabWorkspace;
    readonly activity: AgentActivityHub;
    readonly harness: AgentHarness;
    readonly runId: string;
    readonly assumptionId?: string;
    readonly agentWorkspace: AgentWorkspace;
    readonly prompt: string;
    readonly schema: z.ZodType<Output>;
    readonly signal?: AbortSignal;
    readonly executionProfile?: HarnessExecutionProfile;
}

export interface StructuredAgentRunOutput<Output> {
    readonly value: Output;
    readonly result: HarnessRunResult;
}
