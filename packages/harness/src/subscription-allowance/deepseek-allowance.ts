import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { resolveDeepseekWallet } from "#src/deepseek-cli/deepseek-credential";
import { allowanceDeadline } from "#src/subscription-allowance/allowance-deadline";
import type { SubscriptionAllowance } from "#src/subscription-allowance/subscription-allowance.types";

/**
 * DeepSeek meters no window. There is nothing here that fills and resets, so this reading carries no
 * window at all: a wallet is spent until it is empty, whenever that happens, and it refills only when
 * the operator pays into it.
 *
 * What it does carry is the money, per currency and as DeepSeek wrote it. That is the meter this
 * account has, so it is the meter an operator sets a floor under — the lab stops dispatching here
 * while the wallet is down to what they asked to keep, exactly as it stops on a subscription window
 * that has reached its cap. DeepSeek sells no tier, so nothing stands where a plan name goes.
 */
export async function readDeepseekAllowance(signal?: AbortSignal): Promise<SubscriptionAllowance> {
    const wallet = await resolveDeepseekWallet(allowanceDeadline(signal));
    return {
        kind: HarnessKinds.DEEPSEEK,
        plan: null,
        windows: [],
        balances: wallet.balances
    };
}
