import {
    HarnessAuthenticationMethods,
    HarnessExecutionProfiles,
    HarnessKinds
} from "#src/agent-harness/agent-harness.const";
import type {
    HarnessAuthentication,
    HarnessRunRequest
} from "#src/agent-harness/agent-harness.types";
import type { HarnessEventParser } from "#src/agent-harness/harness-event-parser.types";
import type { HarnessCaptureResult } from "#src/cli-execution/cli-process-runner.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import {
    CODEX_BINARY,
    CodexColorModes,
    CodexLoginMarkers,
    CodexPermissionArguments,
    CodexPermissionModes
} from "#src/codex-cli/codex-cli.const";
import { CodexEventParser } from "#src/codex-cli/codex-event-parser";
import { codexModelApiPolicyConfig } from "#src/model-api-policy/model-api-policy-hook";
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

    protected buildCommand(
        request: HarnessRunRequest,
        responseSchemaPath: string | undefined
    ): HarnessCommand {
        const sharedArguments = [
            "--json",
            "--ignore-user-config",
            "--skip-git-repo-check",
            "--dangerously-bypass-hook-trust",
            "--config",
            codexModelApiPolicyConfig(),
            ...(request.executionProfile === HarnessExecutionProfiles.READ_ONLY
                ? CodexPermissionArguments[CodexPermissionModes.READ_ONLY]
                : CodexPermissionArguments[CodexPermissionModes.UNRESTRICTED]),
            ...(request.model === undefined ? [] : ["--model", request.model]),
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
