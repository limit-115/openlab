import { MAXIMUM_TIMEOUT_MILLISECONDS } from "#src/cli-agent-harness/harness-run-watchdog.const";
import type { WatchdogSignal } from "#src/cli-agent-harness/harness-run-watchdog.types";

export function createWatchdogSignal(
    timeoutMs: number,
    candidates: readonly (AbortSignal | undefined)[]
): WatchdogSignal {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signals = [
        ...candidates.filter((candidate): candidate is AbortSignal => candidate !== undefined),
        timeoutSignal
    ];
    const signal = signals.length === 1 ? timeoutSignal : AbortSignal.any(signals);
    return {
        signal,
        timedOut: () => timeoutSignal.aborted && signal.reason === timeoutSignal.reason
    };
}

export function validateTimeoutMilliseconds(timeoutMs: number, label: string): void {
    if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > MAXIMUM_TIMEOUT_MILLISECONDS
    ) {
        throw new RangeError(
            `${label} must be an integer between 1 and ${MAXIMUM_TIMEOUT_MILLISECONDS} ms`
        );
    }
}
