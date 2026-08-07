import type { ResolveDeepseekWallet } from "#src/deepseek-cli/deepseek-credential.types";
import type { SubscriptionHarnessOptions } from "#src/subscription-cli-harness/subscription-cli-harness.types";

export interface DeepseekHarnessOptions extends SubscriptionHarnessOptions {
    readonly resolveWallet?: ResolveDeepseekWallet;
}
