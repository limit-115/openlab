import { domainValues } from "@lab/protocol/finite-domain/finite-domain-values";

export const SchedulerLane = {
    PROMISING: "promising",
    EXPLORATION: "exploration",
    ADVERSARIAL: "adversarial",
    REPRODUCTION: "reproduction"
} as const;
export type SchedulerLane = (typeof SchedulerLane)[keyof typeof SchedulerLane];

export const schedulerLaneValues = domainValues(SchedulerLane);
