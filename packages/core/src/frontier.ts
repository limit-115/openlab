import type { ClaimStatus } from "@lab/protocol/schemas";
import type { SchedulerLane } from "#src/scheduler";

export type ProgressKind =
    | "counterevidence"
    | "evaluator_fix"
    | "evidence"
    | "excluded_approach"
    | "narrowed_claim"
    | "reproduction";

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

export interface PlateauAssessment {
    readonly plateau: boolean;
    readonly reasons: readonly string[];
    readonly latestProgressAt?: Date;
}

export function assessPlateau(
    frontier: ResearchFrontier,
    now: Date,
    inactivityThresholdMs: number
): PlateauAssessment {
    if (!Number.isSafeInteger(inactivityThresholdMs) || inactivityThresholdMs < 1) {
        throw new RangeError("Inactivity threshold must be a positive safe integer");
    }

    const latestProgressAt = frontier.progress.reduce<Date | undefined>(
        (latest, progress) =>
            latest === undefined || progress.occurredAt > latest ? progress.occurredAt : latest,
        undefined
    );
    const reasons: string[] = [];
    const hasInformativeWork = frontier.nextExperiments.some(
        ({ informationValue }) => Number.isFinite(informationValue) && informationValue > 0
    );
    const activeBranches = frontier.branches.some(({ active }) => active);
    const latestActivityAt = latestProgressAt ?? frontier.observedSince;
    const inactiveLongEnough = now.getTime() - latestActivityAt.getTime() >= inactivityThresholdMs;

    if (!inactiveLongEnough) {
        reasons.push("The inactivity threshold has not been reached");
    }
    if (hasInformativeWork) {
        reasons.push("Informative experiments remain queued");
    }
    if (activeBranches) {
        reasons.push("Research branches are still active");
    }

    return {
        plateau: reasons.length === 0,
        reasons,
        ...(latestProgressAt === undefined ? {} : { latestProgressAt })
    };
}
