import { describe, expect, it } from "vitest";
import { FairScheduler, type SchedulableTask, type SchedulerLane } from "#src/scheduler";

function task(id: string, lane: SchedulerLane, priority = 0): SchedulableTask {
    return { id, lane, priority, queuedAt: new Date("2026-08-02T00:00:00Z") };
}

describe("FairScheduler", () => {
    it("preserves every research lane under sustained promising work", () => {
        const scheduler = new FairScheduler();
        for (let index = 0; index < 12; index += 1) {
            scheduler.enqueue(task(`promising-${index}`, "promising"));
        }
        scheduler.enqueue(task("exploration", "exploration"));
        scheduler.enqueue(task("adversarial", "adversarial"));
        scheduler.enqueue(task("reproduction", "reproduction"));

        const selected = Array.from({ length: 6 }, () => scheduler.next()?.lane);

        expect(selected).toEqual([
            "promising",
            "promising",
            "promising",
            "exploration",
            "adversarial",
            "reproduction"
        ]);
    });

    it("uses priority and queue time only within a lane", () => {
        const scheduler = new FairScheduler();
        scheduler.enqueue(task("low", "exploration", 1));
        scheduler.enqueue(task("high", "exploration", 10));

        expect(scheduler.next()?.id).toBe("high");
    });
});
