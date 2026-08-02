import { describe, expect, it } from "vitest";
import { assessPlateau, type ResearchFrontier } from "#src/frontier";

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
            kind: "evidence",
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
                            lane: "adversarial"
                        }
                    ]
                },
                new Date("2026-08-02T00:00:00Z"),
                60_000
            ).plateau
        ).toBe(false);
    });
});
