import { type HarnessRunStatus, HarnessRunStatuses } from "#src/agent-harness/agent-harness.const";
import type { HarnessProcessExit } from "#src/cli-execution/cli-process-runner.types";

export function determineRunStatus(
    processExit: HarnessProcessExit,
    semanticError: Error | undefined,
    streamCompleted: boolean,
    cancelledByCaller: boolean,
    timedOut: boolean
): HarnessRunStatus {
    if (timedOut) {
        return HarnessRunStatuses.TIMED_OUT;
    }
    if (cancelledByCaller || (!streamCompleted && semanticError === undefined)) {
        return HarnessRunStatuses.CANCELLED;
    }
    if (semanticError) {
        return HarnessRunStatuses.FAILED;
    }
    if (processExit.cancelled) {
        return HarnessRunStatuses.CANCELLED;
    }
    if (processExit.failed || processExit.exitCode !== 0) {
        return HarnessRunStatuses.FAILED;
    }
    return HarnessRunStatuses.SUCCEEDED;
}
