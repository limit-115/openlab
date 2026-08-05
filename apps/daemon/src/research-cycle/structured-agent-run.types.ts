import type {
    HarnessEffortLevel,
    HarnessExecutionProfile
} from "@openlab/harness/agent-harness.const";
import type { AgentHarness, HarnessRunResult } from "@openlab/harness/agent-harness.types";
import type { z } from "zod";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { InvestigationWorkspace } from "#src/investigation-workspace/investigation-workspace";
import type { AgentWorkspace } from "#src/research-cycle/agent-workspace.types";

export interface StructuredAgentRunInput<Output> {
    readonly workspace: InvestigationWorkspace;
    readonly activity: AgentActivityHub;
    readonly harness: AgentHarness;
    readonly runId: string;
    readonly assumptionId?: string;
    readonly agentWorkspace: AgentWorkspace;
    readonly prompt: string;
    readonly schema: z.ZodType<Output>;
    /** The model this role was set to run on. Absent leaves the choice to the harness. */
    readonly model?: string;
    readonly effort?: HarnessEffortLevel;
    readonly signal?: AbortSignal;
    readonly executionProfile?: HarnessExecutionProfile;
}

export interface StructuredAgentRunOutput<Output> {
    readonly value: Output;
    readonly result: HarnessRunResult;
}
