import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { MUSE_UNPUBLISHED_BALANCE } from "#src/harness-allowance/harness-allowance.const";
import type { HarnessAllowanceReading } from "#src/harness-allowance/harness-allowance.types";

/**
 * Muse Code meters nothing an operator can read. There is no window that fills and resets, and unlike
 * a DeepSeek wallet there is not even a number to report: Meta bills the account after the fact and
 * publishes nothing the CLI can be asked for mid-run. So the balance says that in words rather than
 * being left blank, which would read as a reading that failed instead of one that succeeded and found
 * nothing to state. Muse sells no tier either, so it names no plan.
 *
 * Carrying no windows is also why no spend cap can be set against Muse. A cap is a fraction of a
 * window, and there is no window here.
 *
 * Nothing published also means no verdict on whether the account may still be spent, so the reading
 * claims none. The lab goes on dispatching to Muse and learns what Meta thinks from the run itself,
 * which is what it did before there was a reading at all.
 */
export function readMuseAllowance(): Promise<HarnessAllowanceReading> {
    return Promise.resolve({
        kind: HarnessKinds.MUSE,
        plan: null,
        balance: MUSE_UNPUBLISHED_BALANCE,
        spent: false,
        windows: []
    });
}
