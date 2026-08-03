import type { HarnessExecutionProfile } from "@lab/harness/agent-harness.const";
import type { AgentHarness, HarnessPreflight } from "@lab/harness/agent-harness.types";
import type { AgentRole } from "@lab/protocol/agents/agent-role.const";
import type { Assumption } from "@lab/protocol/assumptions/assumption.types";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import type { Finding } from "@lab/protocol/findings/finding.types";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import type { z } from "zod";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type { CapabilityRequestCandidate } from "#src/research-contract/research-contract";
import type {
    AgentWorkspace,
    AgentWorkspaceFactory
} from "#src/research-cycle/agent-workspace.types";
import type { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";
import type { StructuredAgentRunOutput } from "#src/research-cycle/structured-agent-run.types";

export interface ResearchLoopOutcome {
    readonly status: ResearchLoopOutcomeStatus;
    readonly reason?: string;
}

export interface ResearchLoopOptions {
    readonly activity?: AgentActivityHub;
    readonly harnesses?: readonly AgentHarness[];
    readonly workspaceFactory?: AgentWorkspaceFactory;
    readonly signal?: AbortSignal;
    readonly cycleBackoffMs?: number;
    readonly waitForCycle?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}

export interface AvailableHarness {
    readonly harness: AgentHarness;
    readonly preflight: HarnessPreflight;
}

export type CreateAgentWorkspace = (role: AgentRole) => Promise<AgentWorkspace>;

export interface ResearchCycleInput {
    readonly workspace: LabWorkspace;
    readonly activity: AgentActivityHub;
    readonly task: TaskInput;
    readonly available: readonly AvailableHarness[];
    readonly createAgentWorkspace: CreateAgentWorkspace;
    readonly cycle: number;
    readonly signal?: AbortSignal;
}

export interface ResearchCycleResult {
    /** The finding a verifier confirmed, if this cycle produced one. */
    readonly breakthrough?: Finding;
    readonly issues: readonly string[];
}

export interface AssumptionResearchInput {
    readonly workspace: LabWorkspace;
    readonly activity: AgentActivityHub;
    readonly task: TaskInput;
    readonly assumption: Assumption;
    readonly available: readonly AvailableHarness[];
    readonly preferredHarnessIndex: number;
    readonly createAgentWorkspace: CreateAgentWorkspace;
    readonly signal?: AbortSignal;
}

export interface AssumptionResearchResult {
    readonly confirmed?: Finding;
    readonly issues: readonly string[];
}

export interface AgentDispatchInput<Output> {
    readonly workspace: LabWorkspace;
    readonly activity: AgentActivityHub;
    readonly available: readonly AvailableHarness[];
    readonly preferredIndex: number;
    readonly role: AgentRole;
    readonly assumptionId?: string;
    readonly objective: string;
    readonly createAgentWorkspace: CreateAgentWorkspace;
    readonly prompt: string;
    readonly schema: z.ZodType<Output>;
    readonly executionProfile?: HarnessExecutionProfile;
    readonly signal?: AbortSignal;
}

export interface AgentRunOutput<Output> extends StructuredAgentRunOutput<Output> {
    readonly runId: string;
    readonly harness: AgentHarness;
    readonly agentWorkspace: AgentWorkspace;
    readonly capabilityRequests: readonly CapabilityRequest[];
}

export interface AgentCapabilityOutput {
    readonly capability_requests: readonly CapabilityRequestCandidate[];
    /** Absent for the director, which cannot stall the lab on an operator. */
    readonly capability_blocked?: boolean;
}
