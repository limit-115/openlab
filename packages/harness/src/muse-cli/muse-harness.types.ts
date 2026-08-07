import type { ResolveMuseAccount } from "#src/muse-cli/muse-account.types";
import type { SubscriptionHarnessOptions } from "#src/subscription-cli-harness/subscription-cli-harness.types";

export interface MuseHarnessOptions extends SubscriptionHarnessOptions {
    readonly resolveAccount?: ResolveMuseAccount;
}
