import {
    ExperimentStatus,
    type ExperimentStatus as ExperimentStatusValue
} from "@lab/protocol/experiments/experiment-status.const";
import {
    AttemptStatus,
    type AttemptStatus as AttemptStatusValue
} from "#src/tasks/attempt-execution.const";

export const AttemptProjectionDefault = {
    FIRST_ATTEMPT_NUMBER: 1
} as const;

export const ExperimentAttemptStatus = {
    [ExperimentStatus.PLANNED]: AttemptStatus.PLANNED,
    [ExperimentStatus.RUNNING]: AttemptStatus.RUNNING,
    [ExperimentStatus.SUCCEEDED]: AttemptStatus.SUCCEEDED,
    [ExperimentStatus.FAILED]: AttemptStatus.FAILED,
    [ExperimentStatus.TIMED_OUT]: AttemptStatus.TIMED_OUT,
    [ExperimentStatus.CANCELLED]: AttemptStatus.CANCELLED
} as const satisfies Record<ExperimentStatusValue, AttemptStatusValue>;
