import {
    ExternalEffect,
    type ExternalEffect as ExternalEffectValue
} from "#src/tasks/attempt-execution.const";

export function assertRetryIsSafe(
    externalEffect: ExternalEffectValue,
    reconciliationKey: string | null,
    retry: boolean
): void {
    if (retry && externalEffect === ExternalEffect.IRREVERSIBLE && reconciliationKey === null) {
        throw new Error("An irreversible external action cannot be retried without reconciliation");
    }
}

export function assertReconciliationKey(reconciliationKey: string | undefined): void {
    if (reconciliationKey !== undefined && reconciliationKey.trim().length === 0) {
        throw new Error("Reconciliation key must not be empty");
    }
}
