import type { CompletionEvidence } from "#src/lab-lifecycle/completion-evidence.types";
import type { WakeTrigger } from "#src/lab-lifecycle/wake-trigger.const";

export interface LifecycleContext {
    readonly completion?: CompletionEvidence;
    readonly plateauConfirmed?: boolean;
    readonly wakeTrigger?: WakeTrigger;
    readonly failureReason?: string;
}

export interface LifecycleDecision {
    readonly allowed: boolean;
    readonly reasons: readonly string[];
}
