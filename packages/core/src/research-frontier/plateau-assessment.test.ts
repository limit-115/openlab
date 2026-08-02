import { describe, expect, it } from "vitest";
import { assessPlateau } from "#src/research-frontier/plateau-assessment";
import { ProgressKind } from "#src/research-frontier/progress-kind.const";
import type { ResearchFrontier } from "#src/research-frontier/research-frontier.types";
import { SchedulerLane } from "#src/scheduling/scheduler-lane.const";

const frontier: ResearchFrontier = {
    observedSince: new Date("2026-08-01T00:00:00Z"),
    known: [],
    claims: [],
    assumptions: [],
    branches: [],
    blockers: [],
    nextExperiments: [],
    progress: [
        {
            id: "progress-1",
            kind: ProgressKind.EVIDENCE,
            summary: "New benchmark",
            occurredAt: new Date("2026-08-01T00:00:00Z")
        }
    ]
};

describe("assessPlateau", () => {
    it("recognizes inactivity only after useful work and active branches are exhausted", () => {
        expect(assessPlateau(frontier, new Date("2026-08-02T00:00:00Z"), 60_000).plateau).toBe(
            true
        );
        expect(
            assessPlateau(
                {
                    ...frontier,
                    nextExperiments: [
                        {
                            taskId: "task-1",
                            objective: "Try a held-out evaluator",
                            informationValue: 1,
                            lane: SchedulerLane.ADVERSARIAL
                        }
                    ]
                },
                new Date("2026-08-02T00:00:00Z"),
                60_000
            ).plateau
        ).toBe(false);
    });
});
