import type { WakeTrigger } from "#src/lab-lifecycle/wake-trigger.const";

export interface LifecycleContext {
    /** The finding a verifier confirmed. Required to claim a breakthrough. */
    readonly confirmedFindingId?: string;
    readonly wakeTrigger?: WakeTrigger;
    readonly failureReason?: string;
}

export interface LifecycleDecision {
    readonly allowed: boolean;
    readonly reasons: readonly string[];
}
