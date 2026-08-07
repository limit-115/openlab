import { z } from "zod";
import { HarnessAuthenticationMethods, HarnessKinds } from "#src/agent-harness/agent-harness.const";
import type {
    HarnessAuthentication,
    HarnessRunRequest,
    HarnessSession
} from "#src/agent-harness/agent-harness.types";
import type { HarnessEventParser } from "#src/agent-harness/harness-event-parser.types";
import { ClaudeApiProviders } from "#src/claude-cli/claude-cli.const";
import { ClaudeEventParser } from "#src/claude-cli/claude-event-parser";
import {
    claudeAuthenticationCommand,
    claudeRunArguments
} from "#src/claude-cli/claude-run-arguments";
import type { HarnessCaptureResult } from "#src/cli-execution/cli-process-runner.types";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { HarnessCapabilityGaps } from "#src/cli-execution/harness-error.const";
import { ForbiddenEnvironmentVariable } from "#src/cli-execution/subscription-environment.const";
import {
    ClaudeReportedAuthMethods,
    GLM_BINARY,
    GlmSessionDefaults,
    ZAI_CODING_PLAN_BASE_URL
} from "#src/glm-cli/glm-cli.const";
import type { GlmHarnessOptions } from "#src/glm-cli/glm-harness.types";
import { resolveZaiCodingPlan } from "#src/glm-cli/zai-coding-plan";
import type { ResolveZaiCodingPlan, ZaiCodingPlan } from "#src/glm-cli/zai-coding-plan.types";
import { SubscriptionCliHarness } from "#src/subscription-cli-harness/subscription-cli-harness";
import type {
    HarnessCommand,
    HarnessRunPaths
} from "#src/subscription-cli-harness/subscription-cli-harness.types";

/**
 * A CLI that reported anything else ignored the injected coding-plan token and fell back to its own
 * claude.ai login, which would quietly bill a different subscription than the manifest claims.
 */
const GlmAuthStatusSchema = z.looseObject({
    loggedIn: z.literal(true),
    authMethod: z.literal(ClaudeReportedAuthMethods.TOKEN),
    apiProvider: z.literal(ClaudeApiProviders.FIRST_PARTY)
});

export class GlmHarness extends SubscriptionCliHarness {
    readonly kind = HarnessKinds.GLM;
    readonly #resolveCodingPlan: ResolveZaiCodingPlan;

    constructor(options: GlmHarnessOptions = {}) {
        super(GLM_BINARY, options);
        this.#resolveCodingPlan = options.resolveCodingPlan ?? resolveZaiCodingPlan;
    }

    protected authenticationCommand(): readonly string[] {
        return claudeAuthenticationCommand();
    }

    protected override async extendEnvironment(
        sanitized: Record<string, string>
    ): Promise<Record<string, string>> {
        const plan = await this.#codingPlan();
        return {
            ...sanitized,
            [ForbiddenEnvironmentVariable.ANTHROPIC_BASE_URL]: ZAI_CODING_PLAN_BASE_URL,
            [ForbiddenEnvironmentVariable.ANTHROPIC_AUTH_TOKEN]: plan.apiKey
        };
    }

    protected async parseAuthentication(
        result: HarnessCaptureResult
    ): Promise<HarnessAuthentication> {
        const plan = await this.#codingPlan();
        try {
            if (result.failed) {
                throw new Error(result.error ?? (result.stderr || result.stdout));
            }
            GlmAuthStatusSchema.parse(JSON.parse(result.stdout));
        } catch (error) {
            throw this.#missingCodingPlan(error);
        }

        return {
            method: HarnessAuthenticationMethods.ZAI_CODING_PLAN,
            subscription: plan.level,
            wallet: null
        };
    }

    protected sessionDefaults(): HarnessSession {
        return { model: GlmSessionDefaults.MODEL, effort: GlmSessionDefaults.EFFORT };
    }

    protected buildCommand(
        request: HarnessRunRequest,
        session: HarnessSession,
        _paths: HarnessRunPaths
    ): HarnessCommand {
        return { args: claudeRunArguments(request, session) };
    }

    protected createEventParser(request: HarnessRunRequest): HarnessEventParser {
        return new ClaudeEventParser(request.resumeSessionId);
    }

    async #codingPlan(): Promise<ZaiCodingPlan> {
        try {
            return await this.#resolveCodingPlan();
        } catch (error) {
            throw this.#missingCodingPlan(error);
        }
    }

    #missingCodingPlan(cause: unknown): HarnessCapabilityError {
        return new HarnessCapabilityError(
            this.kind,
            HarnessCapabilityGaps.SUBSCRIPTION,
            "Claude CLI is not running on a Z.ai GLM Coding Plan subscription",
            {
                need: "A local ZCode sign-in carrying an active GLM Coding Plan",
                reason: "Wallet-billed Z.ai credentials and first-party Claude billing are forbidden",
                provisioningHint:
                    "Open ZCode, sign in with Z.ai, bind the GLM Coding Plan, and retry"
            },
            { cause }
        );
    }
}
