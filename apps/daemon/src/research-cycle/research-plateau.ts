import { assessPlateau } from "@lab/core/research-frontier/plateau-assessment";
import { ProgressKind } from "@lab/core/research-frontier/progress-kind.const";
import type { ResearchFrontier } from "@lab/core/research-frontier/research-frontier.types";
import { SchedulerLane } from "@lab/core/scheduling/scheduler-lane.const";
import { BranchStatus } from "@lab/protocol/branches/branch-status.const";
import type { Claim } from "@lab/protocol/claims/claim.types";
import type { LabWorkspace } from "#src/lab-workspace/lab-workspace";

export async function waitForConfirmedPlateau(
    workspace: LabWorkspace,
    observedSince: Date,
    progressDates: readonly Date[],
    inactivityThresholdMs: number,
    wait: (milliseconds: number, signal?: AbortSignal) => Promise<void>,
    signal?: AbortSignal
): Promise<boolean> {
    const initial = plateauAssessment(
        workspace,
        observedSince,
        progressDates,
        inactivityThresholdMs
    );
    if (initial.plateau) {
        return true;
    }
    const snapshot = workspace.getSnapshot();
    const hasInformativeWork = snapshot.frontier.next_experiments.length > 0;
    const hasActiveBranches = snapshot.branches.some(
        ({ status }) => status === BranchStatus.ACTIVE
    );
    if (hasInformativeWork || hasActiveBranches) {
        return false;
    }
    const latestActivity = initial.latestProgressAt ?? observedSince;
    const remaining = Math.max(1, inactivityThresholdMs - (Date.now() - latestActivity.getTime()));
    await wait(remaining, signal);
    return plateauAssessment(workspace, observedSince, progressDates, inactivityThresholdMs)
        .plateau;
}

function plateauAssessment(
    workspace: LabWorkspace,
    observedSince: Date,
    progressDates: readonly Date[],
    inactivityThresholdMs: number
) {
    const snapshot = workspace.getSnapshot();
    const assumptionIds = new Set(snapshot.claims.flatMap(({ assumption_ids }) => assumption_ids));
    const frontierClaim = (claim: Claim) => ({
        id: claim.id,
        statement: claim.statement,
        status: claim.status,
        stale: claim.stale
    });
    const frontier: ResearchFrontier = {
        observedSince,
        known: snapshot.frontier.known,
        claims: snapshot.claims.filter(({ id }) => !assumptionIds.has(id)).map(frontierClaim),
        assumptions: snapshot.claims.filter(({ id }) => assumptionIds.has(id)).map(frontierClaim),
        branches: snapshot.branches.map((branch) => ({
            id: branch.id,
            objective: branch.title,
            active: branch.status === BranchStatus.ACTIVE,
            lane: SchedulerLane.EXPLORATION
        })),
        blockers: snapshot.frontier.blockers.map((description, index) => ({
            id: `blocker-${index}`,
            description
        })),
        nextExperiments: snapshot.frontier.next_experiments.map((objective, index) => ({
            taskId: `frontier-task-${index}`,
            objective,
            informationValue: 1,
            lane: SchedulerLane.EXPLORATION
        })),
        progress: progressDates.map((occurredAt, index) => ({
            id: `progress-${index}`,
            kind: ProgressKind.EVIDENCE,
            summary: "Material research progress",
            occurredAt
        }))
    };
    return assessPlateau(frontier, new Date(), inactivityThresholdMs);
}
