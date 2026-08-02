import type { SchedulerWeights } from "#src/scheduling/fair-scheduler.types";
import { SchedulerLane } from "#src/scheduling/scheduler-lane.const";

export const defaultSchedulerWeights: SchedulerWeights = {
    [SchedulerLane.PROMISING]: 3,
    [SchedulerLane.EXPLORATION]: 1,
    [SchedulerLane.ADVERSARIAL]: 1,
    [SchedulerLane.REPRODUCTION]: 1
};
