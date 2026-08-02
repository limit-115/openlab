import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import type { HarnessPreflight } from "#src/agent-harness/agent-harness.types";
import type { HarnessCaptureResult } from "#src/cli-execution/cli-process-runner.types";
import {
    HarnessAbortedError,
    HarnessCapabilityError,
    HarnessTimeoutError
} from "#src/cli-execution/harness-error";
import { HarnessTimeoutPhases } from "#src/cli-execution/harness-error.const";
import { createWatchdogSignal } from "#src/subscription-cli-harness/harness-run-watchdog";
import type { WatchdogSignal } from "#src/subscription-cli-harness/harness-run-watchdog.types";
import type { SubscriptionPreflightRequest } from "#src/subscription-cli-harness/subscription-preflight.types";

export async function runSubscriptionPreflight(
    request: SubscriptionPreflightRequest,
    signal?: AbortSignal
): Promise<HarnessPreflight> {
    throwIfAborted(request.kind, signal);
    const watchdog = createWatchdogSignal(request.timeoutMs, [signal]);
    let versionResult: HarnessCaptureResult;
    let authenticationResult: HarnessCaptureResult;

    try {
        versionResult = await request.runner.capture({
            file: request.binary,
            args: ["--version"],
            cwd: request.cwd,
            environment: request.environment,
            signal: watchdog.signal
        });
        throwIfPreflightStopped(request, watchdog, signal, versionResult);
        authenticationResult = await request.runner.capture({
            file: request.binary,
            args: request.authenticationCommand,
            cwd: request.cwd,
            environment: request.environment,
            signal: watchdog.signal
        });
        throwIfPreflightStopped(request, watchdog, signal, authenticationResult);
    } catch (error) {
        if (error instanceof HarnessTimeoutError || error instanceof HarnessAbortedError) {
            throw error;
        }
        if (watchdog.timedOut()) {
            throw new HarnessTimeoutError(
                request.kind,
                HarnessTimeoutPhases.PREFLIGHT,
                request.timeoutMs
            );
        }
        if (signal?.aborted) {
            throw new HarnessAbortedError(request.kind, { cause: signal.reason ?? error });
        }

        throw unavailableCapability(request.kind, error);
    }

    if (versionResult.failed || !versionResult.stdout.trim()) {
        throw unavailableCapability(
            request.kind,
            new Error(versionResult.error ?? (versionResult.stderr || "version command failed"))
        );
    }

    return {
        kind: request.kind,
        cliVersion: versionResult.stdout.trim(),
        authentication: await request.parseAuthentication(authenticationResult)
    };
}

function throwIfAborted(
    kind: HarnessKind,
    signal?: AbortSignal,
    result?: HarnessCaptureResult
): void {
    if (signal?.aborted || result?.cancelled) {
        throw new HarnessAbortedError(kind, { cause: signal?.reason });
    }
}

function throwIfPreflightStopped(
    request: SubscriptionPreflightRequest,
    watchdog: WatchdogSignal,
    signal: AbortSignal | undefined,
    result: HarnessCaptureResult
): void {
    if (watchdog.timedOut()) {
        throw new HarnessTimeoutError(
            request.kind,
            HarnessTimeoutPhases.PREFLIGHT,
            request.timeoutMs
        );
    }
    throwIfAborted(request.kind, signal, result);
}

function unavailableCapability(kind: HarnessKind, cause: unknown): HarnessCapabilityError {
    return new HarnessCapabilityError(
        kind,
        `${kind} CLI is unavailable or cannot report subscription authentication`,
        {
            need: `${kind} CLI with an active product subscription login`,
            reason: `The ${kind} agent cannot run without proven subscription authentication`,
            provisioningHint: `Install ${kind}, log in interactively with the product subscription, then retry`
        },
        { cause }
    );
}
