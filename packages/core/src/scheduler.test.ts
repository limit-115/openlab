import { describe, expect, it } from "vitest";
import { SchedulerLane, type SchedulerLane as SchedulerLaneValue } from "#src/constants";
import { FairScheduler, type SchedulableTask } from "#src/scheduler";

function task(id: string, lane: SchedulerLaneValue, priority = 0): SchedulableTask {
    return { id, lane, priority, queuedAt: new Date("2026-08-02T00:00:00Z") };
}

describe("FairScheduler", () => {
    it("preserves every research lane under sustained promising work", () => {
        const scheduler = new FairScheduler();
        for (let index = 0; index < 12; index += 1) {
            scheduler.enqueue(task(`promising-${index}`, SchedulerLane.PROMISING));
        }
        scheduler.enqueue(task("exploration", SchedulerLane.EXPLORATION));
        scheduler.enqueue(task("adversarial", SchedulerLane.ADVERSARIAL));
        scheduler.enqueue(task("reproduction", SchedulerLane.REPRODUCTION));

        const selected = Array.from({ length: 6 }, () => scheduler.next()?.lane);

        expect(selected).toEqual([
            SchedulerLane.PROMISING,
            SchedulerLane.PROMISING,
            SchedulerLane.PROMISING,
            SchedulerLane.EXPLORATION,
            SchedulerLane.ADVERSARIAL,
            SchedulerLane.REPRODUCTION
        ]);
    });

    it("uses priority and queue time only within a lane", () => {
        const scheduler = new FairScheduler();
        scheduler.enqueue(task("low", SchedulerLane.EXPLORATION, 1));
        scheduler.enqueue(task("high", SchedulerLane.EXPLORATION, 10));

        expect(scheduler.next()?.id).toBe("high");
    });
});
