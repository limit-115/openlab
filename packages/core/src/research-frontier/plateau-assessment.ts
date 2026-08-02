import type { PlateauAssessment } from "#src/research-frontier/plateau-assessment.types";
import type { ResearchFrontier } from "#src/research-frontier/research-frontier.types";

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
