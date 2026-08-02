import type { AgentHarness, HarnessPreflight } from "@lab/harness/agent-harness.types";
import type { CapabilityRequest } from "@lab/protocol/capabilities/capability-request.types";
import type { FrozenEvaluator } from "#src/evaluator-integrity/frozen-evaluator.types";
import type {
    CapabilityRequestCandidate,
    CriticResult,
    ResearchResult
} from "#src/research-contract/research-contract";
import type { ResearchLoopOutcomeStatus } from "#src/research-cycle/research-loop.const";
import type { ResearchStage } from "#src/research-cycle/research-stage-workspace.const";
import type {
    ResearchWorkspace,
    ResearchWorkspaceFactory
} from "#src/research-cycle/research-stage-workspace.types";
import type { StructuredAgentRunOutput } from "#src/research-cycle/structured-agent-run.types";
import type { MaterialEvidence } from "#src/research-evidence/research-evidence.types";

export interface ResearchLoopOutcome {
    readonly status: ResearchLoopOutcomeStatus;
    readonly reason?: string;
}

export interface ResearchLoopOptions {
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

export interface ResearchBranchResult {
    readonly result?: ResearchResult;
    readonly evidence: readonly MaterialEvidence[];
    readonly evaluatorIdentities: readonly string[];
    readonly artifactSha256s: readonly string[];
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
