import type { HarnessProcessRunner } from "#src/cli-execution/cli-process-runner.types";

export interface SubscriptionHarnessOptions {
    readonly binary?: string;
    readonly runner?: HarnessProcessRunner;
    readonly environment?: Readonly<NodeJS.ProcessEnv>;
    readonly preflightTimeoutMs?: number;
}

export interface HarnessCommand {
    readonly args: readonly string[];
}
