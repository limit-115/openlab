import { HarnessAuthenticationMethods, HarnessKinds } from "#src/agent-harness/agent-harness.const";
import type {
    HarnessAuthentication,
    HarnessRunRequest,
    HarnessSession
} from "#src/agent-harness/agent-harness.types";
import type { HarnessEventParser } from "#src/agent-harness/harness-event-parser.types";
import type { HarnessCaptureResult } from "#src/cli-execution/cli-process-runner.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { HarnessCapabilityGaps } from "#src/cli-execution/harness-error.const";
import {
    CODEX_BINARY,
    CodexLoginMarkers,
    CodexSessionDefaults
} from "#src/codex-cli/codex-cli.const";
import { CodexEventParser } from "#src/codex-cli/codex-event-parser";
import {
    codexReasoningEffortOverride,
    codexRunArguments
} from "#src/codex-cli/codex-run-arguments";
import { codexSessionStore } from "#src/codex-cli/codex-session-store";
import type { SessionStore } from "#src/session-transcript/session-transcript.types";
import { SubscriptionCliHarness } from "#src/subscription-cli-harness/subscription-cli-harness";
import type {
    HarnessCommand,
    HarnessRunPaths,
    SubscriptionHarnessOptions
} from "#src/subscription-cli-harness/subscription-cli-harness.types";

export class CodexHarness extends SubscriptionCliHarness {
    readonly kind = HarnessKinds.CODEX;

    constructor(options: SubscriptionHarnessOptions = {}) {
        super(CODEX_BINARY, options);
    }

    protected authenticationCommand(): readonly string[] {
        return ["login", "status"];
    }

    protected parseAuthentication(result: HarnessCaptureResult): HarnessAuthentication {
        const statusOutput = `${result.stdout}\n${result.stderr}`.trim();
        if (result.failed || !statusOutput.includes(CodexLoginMarkers.CHATGPT)) {
            throw new HarnessCapabilityError(
                this.kind,
                HarnessCapabilityGaps.SUBSCRIPTION,
                "Codex CLI is not authenticated through ChatGPT",
                {
                    need: "Codex CLI logged in through an active ChatGPT subscription",
                    reason: "API-key and usage-billed Codex authentication are forbidden",
                    provisioningHint: "Run `codex login`, choose ChatGPT login, and retry"
                },
                { cause: new Error(result.error ?? statusOutput) }
            );
        }

        return {
            method: HarnessAuthenticationMethods.CHATGPT,
            subscription: null,
            wallet: null
        };
    }

    protected sessionDefaults(): HarnessSession {
        return { model: CodexSessionDefaults.MODEL, effort: CodexSessionDefaults.EFFORT };
    }

    protected buildCommand(
        request: HarnessRunRequest,
        session: HarnessSession,
        paths: HarnessRunPaths
    ): HarnessCommand {
        return {
            args: [
                ...codexRunArguments(
                    request,
                    session,
                    paths.responseSchema,
                    codexReasoningEffortOverride(session.effort)
                )
            ]
        };
    }

    protected createEventParser(request: HarnessRunRequest): HarnessEventParser {
        return new CodexEventParser(request.responseSchema !== undefined);
    }

    protected sessionStore(environment: Readonly<Record<string, string>>): SessionStore {
        return codexSessionStore(environment);
    }
}
