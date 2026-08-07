import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import type { HarnessPreflight } from "#src/agent-harness/agent-harness.types";
import type { HarnessPreflightRequest } from "#src/cli-agent-harness/harness-preflight.types";
import { createWatchdogSignal } from "#src/cli-agent-harness/harness-run-watchdog";
import type { WatchdogSignal } from "#src/cli-agent-harness/harness-run-watchdog.types";
import type { HarnessCaptureResult } from "#src/cli-execution/cli-process-runner.types";
import {
    HarnessAbortedError,
    HarnessCapabilityError,
    HarnessTimeoutError
} from "#src/cli-execution/harness-error";
import {
    HarnessCapabilityGaps,
    HarnessTimeoutPhases
} from "#src/cli-execution/harness-error.const";

export async function runHarnessPreflight(
    request: HarnessPreflightRequest,
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
    request: HarnessPreflightRequest,
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

/**
 * The version command is what decides whether the CLI is there at all, so everything that goes wrong
 * before the authentication check is answered is a missing installation. Whether the credential
 * behind it is the right one is the authentication check's to say, and it says so with its own gap
 * and in its own words — which is why nothing here names a subscription. Three harnesses are signed
 * in interactively, one is handed a key and one logs in to Meta, and this sentence is the one all
 * five get.
 */
function unavailableCapability(kind: HarnessKind, cause: unknown): HarnessCapabilityError {
    return new HarnessCapabilityError(
        kind,
        HarnessCapabilityGaps.INSTALLATION,
        `${kind} CLI is unavailable or cannot report its version`,
        {
            need: `The ${kind} CLI on this machine`,
            reason: `The ${kind} agent cannot run until its own CLI answers`,
            provisioningHint: `Install the ${kind} CLI, make sure it is on PATH, then retry`
        },
        { cause }
    );
}
