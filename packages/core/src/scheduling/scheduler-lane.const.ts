import { domainValues } from "@lab/protocol/constants";

export const SchedulerLane = {
    PROMISING: "promising",
    EXPLORATION: "exploration",
    ADVERSARIAL: "adversarial",
    REPRODUCTION: "reproduction"
} as const;
export type SchedulerLane = (typeof SchedulerLane)[keyof typeof SchedulerLane];

export const schedulerLaneValues = domainValues(SchedulerLane);
