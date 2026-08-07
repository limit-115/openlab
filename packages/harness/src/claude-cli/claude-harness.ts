import { z } from "zod";
import { HarnessAuthenticationMethods, HarnessKinds } from "#src/agent-harness/agent-harness.const";
import type {
    HarnessAuthentication,
    HarnessRunRequest,
    HarnessSession
} from "#src/agent-harness/agent-harness.types";
import type { HarnessEventParser } from "#src/agent-harness/harness-event-parser.types";
import {
    CLAUDE_BINARY,
    ClaudeApiProviders,
    ClaudeSessionDefaults
} from "#src/claude-cli/claude-cli.const";
import { ClaudeEventParser } from "#src/claude-cli/claude-event-parser";
import {
    claudeAuthenticationCommand,
    claudeRunArguments
} from "#src/claude-cli/claude-run-arguments";
import type { HarnessCaptureResult } from "#src/cli-execution/cli-process-runner.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { HarnessCapabilityGaps } from "#src/cli-execution/harness-error.const";
import { SubscriptionCliHarness } from "#src/subscription-cli-harness/subscription-cli-harness";
import type {
    HarnessCommand,
    HarnessRunPaths,
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
        return claudeAuthenticationCommand();
    }

    protected parseAuthentication(result: HarnessCaptureResult): HarnessAuthentication {
        try {
            if (result.failed) {
                throw new Error(result.error ?? (result.stderr || result.stdout));
            }
            const auth = ClaudeAuthStatusSchema.parse(JSON.parse(result.stdout));
            return {
                method: HarnessAuthenticationMethods.CLAUDE_AI,
                subscription: auth.subscriptionType,
                wallet: null
            };
        } catch (error) {
            throw new HarnessCapabilityError(
                this.kind,
                HarnessCapabilityGaps.SUBSCRIPTION,
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

    protected sessionDefaults(): HarnessSession {
        return { model: ClaudeSessionDefaults.MODEL, effort: ClaudeSessionDefaults.EFFORT };
    }

    protected buildCommand(
        request: HarnessRunRequest,
        session: HarnessSession,
        _paths: HarnessRunPaths
    ): HarnessCommand {
        return { args: claudeRunArguments(request, session) };
    }

    protected createEventParser(): HarnessEventParser {
        return new ClaudeEventParser();
    }
}
