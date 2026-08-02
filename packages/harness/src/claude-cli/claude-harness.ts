import { z } from "zod";
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
import {
    CLAUDE_BINARY,
    ClaudeApiProviders,
    ClaudeOutputFormats,
    ClaudePermissionModes
} from "#src/claude-cli/claude-cli.const";
import { ClaudeEventParser } from "#src/claude-cli/claude-event-parser";
import type { HarnessCaptureResult } from "#src/cli-execution/cli-process-runner.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { claudeModelApiPolicySettings } from "#src/model-api-policy/model-api-policy-hook";
import { SubscriptionCliHarness } from "#src/subscription-cli-harness/subscription-cli-harness";
import type {
    HarnessCommand,
    SubscriptionHarnessOptions
} from "#src/subscription-cli-harness/subscription-cli-harness.types";

const ClaudeAuthStatusSchema = z.looseObject({
    loggedIn: z.literal(true),
    authMethod: z.literal(HarnessAuthenticationMethods.CLAUDE_AI),
    apiProvider: z.literal(ClaudeApiProviders.FIRST_PARTY),
    subscriptionType: z.string().trim().min(1)
});

export class ClaudeHarness extends SubscriptionCliHarness {
    readonly kind = HarnessKinds.CLAUDE;

    constructor(options: SubscriptionHarnessOptions = {}) {
        super(CLAUDE_BINARY, options);
    }

    protected authenticationCommand(): readonly string[] {
        return ["--setting-sources", "", "auth", "status", "--json"];
    }

    protected parseAuthentication(result: HarnessCaptureResult): HarnessAuthentication {
        try {
            if (result.failed) {
                throw new Error(result.error ?? (result.stderr || result.stdout));
            }
            const auth = ClaudeAuthStatusSchema.parse(JSON.parse(result.stdout));
            return {
                method: HarnessAuthenticationMethods.CLAUDE_AI,
                subscription: auth.subscriptionType
            };
        } catch (error) {
            throw new HarnessCapabilityError(
                this.kind,
                "Claude CLI is not authenticated through a claude.ai subscription",
                {
                    need: "Claude CLI logged in through an active claude.ai subscription",
                    reason: "Console, API-key, Bedrock, Vertex, and Foundry billing are forbidden",
                    provisioningHint: "Run `claude auth login`, choose claude.ai login, and retry"
                },
                { cause: error }
            );
        }
    }

    protected buildCommand(
        request: HarnessRunRequest,
        _responseSchemaPath: string | undefined
    ): HarnessCommand {
        return {
            args: [
                "-p",
                "--output-format",
                ClaudeOutputFormats.STREAM_JSON,
                "--verbose",
                "--include-partial-messages",
                ...(request.executionProfile === HarnessExecutionProfiles.READ_ONLY
                    ? []
                    : ["--dangerously-skip-permissions"]),
                "--permission-mode",
                ...(request.executionProfile === HarnessExecutionProfiles.READ_ONLY
                    ? [ClaudePermissionModes.PLAN]
                    : [ClaudePermissionModes.BYPASS_PERMISSIONS]),
                "--setting-sources",
                "",
                "--settings",
                claudeModelApiPolicySettings(),
                ...(request.model === undefined ? [] : ["--model", request.model]),
                ...(request.resumeSessionId === undefined
                    ? []
                    : ["--resume", request.resumeSessionId]),
                ...(request.responseSchema === undefined
                    ? []
                    : ["--json-schema", JSON.stringify(request.responseSchema)])
            ]
        };
    }

    protected createEventParser(request: HarnessRunRequest): HarnessEventParser {
        return new ClaudeEventParser(request.resumeSessionId);
    }
}
