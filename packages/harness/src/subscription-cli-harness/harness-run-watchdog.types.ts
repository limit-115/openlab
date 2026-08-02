export interface WatchdogSignal {
    readonly signal: AbortSignal;
    timedOut(): boolean;
}
