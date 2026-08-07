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

/**
 * The run's own files, as paths a command line can name. They are handed to every harness rather than
 * only to the ones that need them because a CLI that takes a prompt or a schema by path must point at
 * the artifact the manifest already hashed, never at a second copy written somewhere else.
 */
export interface HarnessRunPaths {
    readonly prompt: string;
    readonly responseSchema: string | undefined;
}
