import type { HarnessKind } from "#src/agent-harness/agent-harness.const";
import type { HarnessAuthentication } from "#src/agent-harness/agent-harness.types";
import type {
    HarnessCaptureResult,
    HarnessProcessRunner
} from "#src/cli-execution/cli-process-runner.types";

export interface SubscriptionPreflightRequest {
    readonly kind: HarnessKind;
    readonly binary: string;
    readonly runner: HarnessProcessRunner;
    readonly environment: Readonly<Record<string, string>>;
    readonly cwd: string;
    readonly timeoutMs: number;
    readonly authenticationCommand: readonly string[];
    readonly parseAuthentication: (result: HarnessCaptureResult) => HarnessAuthentication;
}
