import {
    HarnessAuthenticationMethods,
    type HarnessEffortLevel,
    HarnessExecutionProfiles,
    HarnessKinds
} from "#src/agent-harness/agent-harness.const";
import type {
    HarnessAuthentication,
    HarnessRunRequest,
    HarnessSession
} from "#src/agent-harness/agent-harness.types";
import type { HarnessEventParser } from "#src/agent-harness/harness-event-parser.types";
import type { HarnessCaptureResult } from "#src/cli-execution/cli-process-runner.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import {
    CODEX_BINARY,
    CodexColorModes,
    CodexConfigKeys,
    CodexLoginMarkers,
    CodexPermissionArguments,
    CodexPermissionModes,
    CodexSessionDefaults
} from "#src/codex-cli/codex-cli.const";
import { CodexEventParser } from "#src/codex-cli/codex-event-parser";
import { SubscriptionCliHarness } from "#src/subscription-cli-harness/subscription-cli-harness";
import type {
    HarnessCommand,
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
            subscription: null
        };
    }

    protected sessionDefaults(): HarnessSession {
        return { model: CodexSessionDefaults.MODEL, effort: CodexSessionDefaults.EFFORT };
    }

    protected buildCommand(
        request: HarnessRunRequest,
        session: HarnessSession,
        responseSchemaPath: string | undefined
    ): HarnessCommand {
        const sharedArguments = [
            "--json",
            "--ignore-user-config",
            "--skip-git-repo-check",
            ...(request.executionProfile === HarnessExecutionProfiles.READ_ONLY
                ? CodexPermissionArguments[CodexPermissionModes.READ_ONLY]
                : CodexPermissionArguments[CodexPermissionModes.UNRESTRICTED]),
            "--model",
            session.model,
            "--config",
            codexReasoningEffortConfig(session.effort),
            ...(responseSchemaPath === undefined ? [] : ["--output-schema", responseSchemaPath])
        ];

        if (request.resumeSessionId) {
            return {
                args: ["exec", "resume", ...sharedArguments, request.resumeSessionId, "-"]
            };
        }

        return {
            args: ["exec", "--color", CodexColorModes.NEVER, ...sharedArguments, "-"]
        };
    }

    protected createEventParser(request: HarnessRunRequest): HarnessEventParser {
        return new CodexEventParser(request.resumeSessionId, request.responseSchema !== undefined);
    }
}

/** Codex parses an override value as TOML, so the effort has to arrive as a quoted string. */
function codexReasoningEffortConfig(effort: HarnessEffortLevel): string {
    return `${CodexConfigKeys.MODEL_REASONING_EFFORT}=${JSON.stringify(effort)}`;
}
