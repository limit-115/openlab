import { AgentRunStatus } from "@lab/protocol/agent-runs/agent-run-status.const";
import { EventType } from "@lab/protocol/investigation-events/event-type.const";

/** Which event a run's unsuccessful end is journalled as. */
export const RUN_FAILURE_EVENT = {
    [AgentRunStatus.FAILED]: EventType.RUN_FAILED,
    [AgentRunStatus.TIMED_OUT]: EventType.RUN_TIMED_OUT,
    [AgentRunStatus.CANCELLED]: EventType.RUN_CANCELLED
} as const;
