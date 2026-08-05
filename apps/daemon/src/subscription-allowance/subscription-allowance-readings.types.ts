import type { HarnessKind } from "@openlab/harness/agent-harness.const";
import type { SubscriptionAllowance as HarnessAllowance } from "@openlab/harness/subscription-allowance.types";

export type ReadHarnessAllowance = (
    kind: HarnessKind,
    signal?: AbortSignal
) => Promise<HarnessAllowance>;

export interface AllowanceReadingsOptions {
    readonly read?: ReadHarnessAllowance;
    readonly ttlMs?: number;
    /** Epoch milliseconds, so a test can age a reading without waiting for it to expire. */
    readonly now?: () => number;
}
