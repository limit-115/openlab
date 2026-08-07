import type { CliHarnessOptions } from "#src/cli-agent-harness/cli-agent-harness.types";
import type { ResolveMuseAccount } from "#src/muse-cli/muse-account.types";

export interface MuseHarnessOptions extends CliHarnessOptions {
    readonly resolveAccount?: ResolveMuseAccount;
}
