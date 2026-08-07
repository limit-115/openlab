import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { MUSE_METERED_PLAN } from "#src/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowance } from "#src/subscription-allowance/subscription-allowance.types";

/**
 * Muse Code meters nothing an operator can read. There is no window that fills and resets, and unlike
 * a DeepSeek wallet there is not even a balance to report: Meta bills the account after the fact and
 * publishes nothing the CLI can be asked for mid-run. So this reading states the one true thing —
 * that the account is spent by the token — and carries no windows, which is also why no spend cap can
 * be set against Muse. A cap is a fraction of a window, and there is no window here.
 */
export function readMuseAllowance(): Promise<SubscriptionAllowance> {
    return Promise.resolve({
        kind: HarnessKinds.MUSE,
        plan: MUSE_METERED_PLAN,
        windows: []
    });
}
