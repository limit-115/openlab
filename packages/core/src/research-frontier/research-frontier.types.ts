import type { ClaimStatus } from "@lab/protocol/constants";
import type { ProgressKind } from "#src/research-frontier/progress-kind.const";
import type { SchedulerLane } from "#src/scheduling/scheduler-lane.const";

export interface FrontierClaim {
    readonly id: string;
    readonly statement: string;
    readonly status: ClaimStatus;
    readonly stale: boolean;
}

export interface FrontierBranch {
    readonly id: string;
    readonly objective: string;
    readonly active: boolean;
    readonly lane: SchedulerLane;
}

export interface FrontierBlocker {
    readonly id: string;
    readonly description: string;
    readonly capabilityRequestId?: string;
}

export interface NextExperiment {
    readonly taskId: string;
    readonly objective: string;
    readonly informationValue: number;
    readonly lane: SchedulerLane;
}

export interface ProgressRecord {
    readonly id: string;
    readonly kind: ProgressKind;
    readonly summary: string;
    readonly occurredAt: Date;
}

export interface ResearchFrontier {
    readonly observedSince: Date;
    readonly known: readonly string[];
    readonly claims: readonly FrontierClaim[];
    readonly assumptions: readonly FrontierClaim[];
    readonly branches: readonly FrontierBranch[];
    readonly blockers: readonly FrontierBlocker[];
    readonly nextExperiments: readonly NextExperiment[];
    readonly progress: readonly ProgressRecord[];
}
