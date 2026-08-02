import type { SchedulerLane } from "@lab/core/scheduling/scheduler-lane.const";
import type { branches } from "#src/lab-database/lab-schema";

export type BranchRecord = typeof branches.$inferSelect;

export interface CreateBranchInput {
    readonly id: string;
    readonly labId: string;
    readonly title: string;
    readonly approach: string;
    readonly lane: SchedulerLane;
    readonly isolated?: boolean;
    readonly now?: Date;
}
