export function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw signal.reason instanceof Error ? signal.reason : new Error("Research loop cancelled");
    }
}
