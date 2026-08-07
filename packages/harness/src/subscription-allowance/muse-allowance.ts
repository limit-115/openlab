import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { MUSE_METERED_PLAN } from "#src/subscription-allowance/subscription-allowance.const";
import type { SubscriptionAllowance } from "#src/subscription-allowance/subscription-allowance.types";

/**
 * Muse Code publishes no account meter at all. There is no window that fills and resets, and unlike a
 * DeepSeek wallet there is no balance to read either: Meta bills after the fact and answers no
 * endpoint about what is left. So this reading carries neither meter and states the one true thing
 * about the account — that it is spent by the token.
 *
 * What a Muse run costs is not unknowable, though: the CLI writes the tokens of every model call into
 * its own session log, and Meta publishes the price of each of them. That is a spend the lab can add
 * up per run, and it is where a cap on Muse belongs — against the run, not against an account meter
 * that does not exist.
 */
export function readMuseAllowance(): Promise<SubscriptionAllowance> {
    return Promise.resolve({
        kind: HarnessKinds.MUSE,
        plan: MUSE_METERED_PLAN,
        windows: [],
        balances: []
    });
}
