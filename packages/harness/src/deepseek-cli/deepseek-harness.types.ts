import type { CliHarnessOptions } from "#src/cli-agent-harness/cli-agent-harness.types";
import type { ResolveDeepseekWallet } from "#src/deepseek-cli/deepseek-credential.types";

export interface DeepseekHarnessOptions extends CliHarnessOptions {
    readonly resolveWallet?: ResolveDeepseekWallet;
}
