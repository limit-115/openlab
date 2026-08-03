import type { AgentHarness, HarnessPreflight } from "@lab/harness/agent-harness.types";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import type { TaskInput } from "@lab/protocol/research-task/task-input.types";
import type { AgentActivityHub } from "#src/agent-activity/agent-activity-hub";
import type { FrozenEvaluator } from "#src/evaluator-integrity/frozen-evaluator.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";
import type {
    CapabilityRequestCandidate,
    CriticResult,
    DirectorPlan,
    ResearchResult
} from "#src/research-contract/research-contract";
import type { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";
import type { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";
import type {
    ResearchWorkspace,
    ResearchWorkspaceFactory
} from "#src/research-cycle/research-stage-workspace.types";
import type { StructuredAgentRunOutput } from "#src/research-cycle/structured-agent-run.types";
import type { MaterialEvidence, PlanTarget } from "#src/research-evidence/research-evidence.types";

export interface ResearchLoopOutcome {
    readonly status: ResearchLoopOutcomeStatus;
    readonly reason?: string;
}

export interface ResearchLoopOptions {
    readonly activity?: AgentActivityHub;
    readonly harnesses?: readonly AgentHarness[];
    readonly workspaceFactory?: ResearchWorkspaceFactory;
    readonly signal?: AbortSignal;
    readonly plateauInactivityMs?: number;
    readonly waitForPlateau?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
    readonly cycleBackoffMs?: number;
    readonly waitForCycle?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}

export interface AvailableHarness {
    readonly harness: AgentHarness;
    readonly preflight: HarnessPreflight;
}

export interface ResearchCycleInput {
    readonly workspace: LabWorkspace;
    readonly activity: AgentActivityHub;
    readonly task: TaskInput;
    readonly available: readonly AvailableHarness[];
    readonly createAgentWorkspace: CreateResearchWorkspace;
    readonly cycle: number;
    readonly signal?: AbortSignal;
}

export interface ResearchBranchInput {
    readonly workspace: LabWorkspace;
    readonly activity: AgentActivityHub;
    readonly task: TaskInput;
    readonly plan: DirectorPlan;
    readonly direction: DirectorPlan["directions"][number];
    readonly directionIndex: number;
    readonly cycle: number;
    readonly planTargets: readonly PlanTarget[];
    readonly available: readonly AvailableHarness[];
    readonly preferredHarnessIndex: number;
    readonly createAgentWorkspace: CreateResearchWorkspace;
    readonly signal?: AbortSignal;
}

export interface ResearchBranchResult {
    readonly result?: ResearchResult;
    readonly evidence: readonly MaterialEvidence[];
    readonly issues: readonly string[];
}

export interface ResearchCycleResult {
    readonly completed: boolean;
    readonly nextExperiments: readonly string[];
    readonly progress: readonly Date[];
}

export interface RoleIdentifiers {
    readonly branchId: string;
    readonly agentId: string;
    readonly taskId: string;
}

export type CreateResearchWorkspace = (stage: ResearchStage) => Promise<ResearchWorkspace>;

export interface StageRunOutput<Output> extends StructuredAgentRunOutput<Output> {
    readonly harness: AgentHarness;
    readonly agentWorkspace: ResearchWorkspace;
    readonly capabilityRequests: readonly CapabilityRequest[];
}

export interface AgentCapabilityOutput {
    readonly capability_requests: readonly CapabilityRequestCandidate[];
}

export interface CriticStageRunOutput extends StageRunOutput<CriticResult> {
    readonly evaluator: FrozenEvaluator;
}
