import { HarnessKinds } from "#src/agent-harness/agent-harness.const";
import { resolveDeepseekWallet } from "#src/deepseek-cli/deepseek-credential";
import type { ResolveDeepseekWallet } from "#src/deepseek-cli/deepseek-credential.types";
import { allowanceDeadline } from "#src/harness-allowance/allowance-deadline";
import type { HarnessAllowanceReading } from "#src/harness-allowance/harness-allowance.types";

/**
 * DeepSeek meters nothing. There is no window that fills and resets, so this reading carries none:
 * a wallet is spent until it is empty, whenever that happens. What it has left is reported as the
 * balance it is, and DeepSeek sells no tier, so it names no plan.
 *
 * Carrying no windows also means no spend cap can be set against DeepSeek, which is the truth rather
 * than an omission: a cap is a fraction of a window, and there is no window here to take a fraction
 * of.
 */
export async function readDeepseekAllowance(
    signal?: AbortSignal,
    resolveWallet: ResolveDeepseekWallet = resolveDeepseekWallet
): Promise<HarnessAllowanceReading> {
    const wallet = await resolveWallet(allowanceDeadline(signal));
    return {
        kind: HarnessKinds.DEEPSEEK,
        plan: null,
        balance: wallet.balance,
        windows: []
    };
}
