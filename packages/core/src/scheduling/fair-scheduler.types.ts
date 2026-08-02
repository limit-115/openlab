import type { SchedulerLane } from "#src/scheduling/scheduler-lane.const";

export interface SchedulableTask {
    readonly id: string;
    readonly lane: SchedulerLane;
    readonly priority: number;
    readonly queuedAt: Date;
}

export type SchedulerWeights = Readonly<Record<SchedulerLane, number>>;
