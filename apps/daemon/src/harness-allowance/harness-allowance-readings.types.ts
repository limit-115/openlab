import type { HarnessKind } from "@openlab/harness/agent-harness.const";
import type { HarnessAllowanceReading } from "@openlab/harness/harness-allowance.types";

export type ReadHarnessAllowance = (
    kind: HarnessKind,
    signal?: AbortSignal
) => Promise<HarnessAllowanceReading>;

export interface AllowanceReadingsOptions {
    readonly read?: ReadHarnessAllowance;
    readonly ttlMs?: number;
    /** Epoch milliseconds, so a test can age a reading without waiting for it to expire. */
    readonly now?: () => number;
}
