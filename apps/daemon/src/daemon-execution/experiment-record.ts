import { EXECUTION_STATUS, type ExecutionStatus } from "@lab/executor/constants";
import type { HarnessRunResult } from "@lab/harness/agent-harness.types";
import { EventType, ExperimentStatus } from "@lab/protocol/constants";

export function renderHarnessCommand(run: HarnessRunResult): string {
    return renderCommand(run.command.file, run.command.args);
}

export function renderCommand(file: string, args: readonly string[]): string {
    return [file, ...args].map((part) => JSON.stringify(part)).join(" ");
}

export function protocolExperimentStatus(
    status: Exclude<ExecutionStatus, typeof EXECUTION_STATUS.RUNNING>
): Exclude<ExperimentStatus, typeof ExperimentStatus.PLANNED | typeof ExperimentStatus.RUNNING> {
    switch (status) {
        case EXECUTION_STATUS.SUCCEEDED:
            return ExperimentStatus.SUCCEEDED;
        case EXECUTION_STATUS.TIMED_OUT:
            return ExperimentStatus.TIMED_OUT;
        case EXECUTION_STATUS.CANCELLED:
            return ExperimentStatus.CANCELLED;
        case EXECUTION_STATUS.FAILED:
        case EXECUTION_STATUS.SPAWN_ERROR:
            return ExperimentStatus.FAILED;
    }
}

export function experimentEventType(
    status: Exclude<
        ExperimentStatus,
        typeof ExperimentStatus.PLANNED | typeof ExperimentStatus.RUNNING
    >
) {
    switch (status) {
        case ExperimentStatus.SUCCEEDED:
            return EventType.EXPERIMENT_SUCCEEDED;
        case ExperimentStatus.TIMED_OUT:
            return EventType.EXPERIMENT_TIMED_OUT;
        case ExperimentStatus.CANCELLED:
            return EventType.EXPERIMENT_CANCELLED;
        case ExperimentStatus.FAILED:
            return EventType.EXPERIMENT_FAILED;
    }
}

export function attemptEventType(
    status: Exclude<
        ExperimentStatus,
        typeof ExperimentStatus.PLANNED | typeof ExperimentStatus.RUNNING
    >
) {
    switch (status) {
        case ExperimentStatus.SUCCEEDED:
            return EventType.ATTEMPT_SUCCEEDED;
        case ExperimentStatus.TIMED_OUT:
            return EventType.ATTEMPT_TIMED_OUT;
        case ExperimentStatus.CANCELLED:
            return EventType.ATTEMPT_CANCELLED;
        case ExperimentStatus.FAILED:
            return EventType.ATTEMPT_FAILED;
    }
}
