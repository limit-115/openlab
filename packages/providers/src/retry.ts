import pRetry from "p-retry";
import { ProviderError } from "#src/errors";
import type { ProviderRuntimeOptions } from "#src/types";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_MIN_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 5_000;

interface ErrorWithStatus {
    readonly status?: number;
    readonly name?: string;
    readonly message?: string;
}

function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
    return typeof error === "object" && error !== null;
}

export function normalizeProviderError(error: unknown, provider: string): ProviderError {
    if (error instanceof ProviderError) {
        return error;
    }

    const details = isErrorWithStatus(error) ? error : undefined;
    const status = details?.status;
    const name = details?.name ?? "";
    const message = details?.message ?? `${provider} request failed`;

    if (name.includes("Abort") || name === "AbortError") {
        return new ProviderError("aborted", `${provider} request was aborted`, {
            provider,
            cause: error
        });
    }

    if (name.includes("Timeout") || name === "TimeoutError") {
        return new ProviderError("timeout", `${provider} request timed out`, {
            provider,
            cause: error,
            retryable: true
        });
    }

    if (status === 401 || status === 403) {
        return new ProviderError("authentication", message, { provider, cause: error });
    }

    if (status === 429) {
        return new ProviderError("rate_limited", message, {
            provider,
            cause: error,
            retryable: true
        });
    }

    if (status === 408 || status === 409 || (status !== undefined && status >= 500)) {
        return new ProviderError("unavailable", message, {
            provider,
            cause: error,
            retryable: true
        });
    }

    if (status !== undefined && status >= 400 && status < 500) {
        return new ProviderError("invalid_request", message, { provider, cause: error });
    }

    if (name.includes("Connection") || error instanceof TypeError) {
        return new ProviderError("unavailable", message, {
            provider,
            cause: error,
            retryable: true
        });
    }

    return new ProviderError("unknown", message, { provider, cause: error });
}

export async function runProviderOperation<T>(
    provider: string,
    operation: (signal: AbortSignal) => Promise<T>,
    runtimeOptions: ProviderRuntimeOptions,
    requestTimeoutMs: number | undefined,
    externalSignal?: AbortSignal
): Promise<T> {
    const timeoutMs = requestTimeoutMs ?? runtimeOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeoutController = new AbortController();
    const timer = setTimeout(() => {
        timeoutController.abort(
            new DOMException(`${provider} timed out after ${timeoutMs}ms`, "TimeoutError")
        );
    }, timeoutMs);
    timer.unref();

    const signal = externalSignal
        ? AbortSignal.any([externalSignal, timeoutController.signal])
        : timeoutController.signal;

    try {
        return await pRetry(
            async () => {
                try {
                    return await operation(signal);
                } catch (error) {
                    throw normalizeProviderError(error, provider);
                }
            },
            {
                retries: runtimeOptions.retry?.retries ?? DEFAULT_RETRIES,
                minTimeout: runtimeOptions.retry?.minDelayMs ?? DEFAULT_MIN_DELAY_MS,
                maxTimeout: runtimeOptions.retry?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
                factor: 2,
                randomize: true,
                signal,
                shouldRetry: ({ error }) =>
                    error instanceof ProviderError && error.retryable && !signal.aborted
            }
        );
    } catch (error) {
        if (timeoutController.signal.aborted) {
            throw new ProviderError("timeout", `${provider} timed out after ${timeoutMs}ms`, {
                provider,
                cause: error,
                retryable: true
            });
        }

        if (externalSignal?.aborted) {
            throw new ProviderError("aborted", `${provider} request was aborted`, {
                provider,
                cause: externalSignal.reason ?? error
            });
        }

        throw normalizeProviderError(error, provider);
    } finally {
        clearTimeout(timer);
    }
}
