import type { HarnessAllowanceRoster } from "@openlab/protocol/harness-allowance/harness-allowance.types";

/**
 * When the numbers on the page were read. The daemon holds each vendor separately and stands by the
 * last answer from one that throttles the next reading, so the allowances can be read at
 * different moments. The oldest of them is the only one that cannot claim the page is fresher than
 * it is. The readings are UTC timestamps, so the earliest is also the first in text order.
 */
export function allowanceReadingTime(allowances: HarnessAllowanceRoster): string | undefined {
    return allowances
        .map((allowance) => allowance.read_at)
        .sort()
        .at(0);
}
