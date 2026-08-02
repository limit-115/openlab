import {
    SchedulerLane,
    type SchedulerLane as SchedulerLaneValue
} from "@lab/core/scheduling/scheduler-lane.const";
import { AgentRole, type AgentRole as AgentRoleValue } from "@lab/protocol/agents/agent-role.const";

export const AgentRoleSchedulerLane = {
    [AgentRole.DIRECTOR]: SchedulerLane.EXPLORATION,
    [AgentRole.RESEARCHER]: SchedulerLane.EXPLORATION,
    [AgentRole.CRITIC]: SchedulerLane.ADVERSARIAL,
    [AgentRole.VERIFIER]: SchedulerLane.REPRODUCTION
} as const satisfies Record<AgentRoleValue, SchedulerLaneValue>;
