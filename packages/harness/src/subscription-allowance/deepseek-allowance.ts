import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { resolveDeepseekWallet } from "#src/deepseek-cli/deepseek-credential";
import { allowanceDeadline } from "#src/subscription-allowance/allowance-deadline";
import type { SubscriptionAllowance } from "#src/subscription-allowance/subscription-allowance.types";

/**
 * DeepSeek meters nothing. There is no window that fills and resets, so this reading carries none:
 * a wallet is spent until it is empty, whenever that happens. The balance is reported as the plan,
 * because it is the one thing about the account that decides whether the lab can keep working, and
 * the harness setup card says outright that it is money rather than a subscription.
 *
 * Carrying no windows also means no spend cap can be set against DeepSeek, which is the truth rather
 * than an omission: a cap is a fraction of a window, and there is no window here to take a fraction
 * of.
 */
export async function readDeepseekAllowance(signal?: AbortSignal): Promise<SubscriptionAllowance> {
    const wallet = await resolveDeepseekWallet(allowanceDeadline(signal));
    return {
        kind: HarnessKinds.DEEPSEEK,
        plan: wallet.balance,
        windows: []
    };
}
