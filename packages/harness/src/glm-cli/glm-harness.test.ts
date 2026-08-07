import { afterEach, describe, expect, it } from "vitest";
import {
    HarnessAuthenticationMethods,
    HarnessKinds,
    HarnessRunStatuses
} from "#src/agent-harness/agent-harness.const";
import { ClaudeApiProviders } from "#src/claude-cli/claude-cli.const";
import {
    harnessRequest,
    lastCompleted,
    removeHarnessRunDirectories
} from "#src/cli-agent-harness/harness-run.fixture";
import {
    captureSuccess,
    FakeHarnessProcessRunner,
    streamSuccess
} from "#src/cli-execution/cli-process-runner.fixture";
import { ForbiddenEnvironmentVariable } from "#src/cli-execution/harness-environment.const";
import { testEnvironment } from "#src/cli-execution/harness-environment.fixture";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import {
    ClaudeReportedAuthMethods,
    GlmSessionDefaults,
    ZAI_CODING_PLAN_BASE_URL
} from "#src/glm-cli/glm-cli.const";
import { GlmHarness } from "#src/glm-cli/glm-harness";
import type { ZaiCodingPlan } from "#src/glm-cli/zai-coding-plan.types";

const GlmTestNativeEventTypes = {
    SYSTEM: "system",
    RESULT: "result"
} as const;

const GlmTestCliValues = {
    VERSION: "2.1.220 (Claude Code)",
    SESSION_ID: "glm-session"
} as const;

const GlmTestCodingPlan: ZaiCodingPlan = {
    apiKey: "coding-plan-key",
    level: "pro"
} as const;

function authStatus(overrides: Readonly<Record<string, unknown>> = {}): string {
    return JSON.stringify({
        loggedIn: true,
        authMethod: ClaudeReportedAuthMethods.TOKEN,
        apiProvider: ClaudeApiProviders.FIRST_PARTY,
        ...overrides
    });
}

function successfulRunner(): FakeHarnessProcessRunner {
    const runner = new FakeHarnessProcessRunner([
        captureSuccess(GlmTestCliValues.VERSION),
        captureSuccess(authStatus())
    ]);
    runner.nextStream = streamSuccess([
        {
            type: GlmTestNativeEventTypes.SYSTEM,
            subtype: "init",
            session_id: GlmTestCliValues.SESSION_ID
        },
        {
            type: GlmTestNativeEventTypes.RESULT,
            subtype: "success",
            is_error: false,
            session_id: GlmTestCliValues.SESSION_ID
        }
    ]);
    return runner;
}

afterEach(removeHarnessRunDirectories);

describe("GlmHarness", () => {
    it("overrides an inherited endpoint with the subscription-billed one and reports the plan tier", async () => {
        const runner = successfulRunner();
        const harness = new GlmHarness({
            runner,
            environment: testEnvironment(),
            resolveCodingPlan: async () => GlmTestCodingPlan
        });

        const events = await Array.fromAsync(harness.run(await harnessRequest("glm-run")));
        const spawn = runner.spawnRequests[0];
        const completed = lastCompleted(events);

        expect(spawn?.environment).toMatchObject({
            [ForbiddenEnvironmentVariable.ANTHROPIC_BASE_URL]: ZAI_CODING_PLAN_BASE_URL,
            [ForbiddenEnvironmentVariable.ANTHROPIC_AUTH_TOKEN]: GlmTestCodingPlan.apiKey
        });
        expect(spawn?.args).toEqual(expect.arrayContaining(["--model", GlmSessionDefaults.MODEL]));
        expect(completed.result).toMatchObject({
            kind: HarnessKinds.GLM,
            status: HarnessRunStatuses.SUCCEEDED,
            authentication: {
                method: HarnessAuthenticationMethods.ZAI_CODING_PLAN,
                subscription: GlmTestCodingPlan.level
            }
        });
    });

    it("refuses to run a credential Z.ai does not answer for with a coding plan", async () => {
        const runner = successfulRunner();
        const harness = new GlmHarness({
            runner,
            environment: testEnvironment(),
            resolveCodingPlan: async () => {
                throw new Error("Z.ai reported no coding plan for this credential (HTTP 401)");
            }
        });

        await expect(harness.preflight()).rejects.toBeInstanceOf(HarnessCapabilityError);
        expect(runner.spawnRequests).toHaveLength(0);
    });

    it("refuses a CLI that answered from its own claude.ai login instead of the injected token", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(GlmTestCliValues.VERSION),
            captureSuccess(
                authStatus({
                    authMethod: HarnessAuthenticationMethods.CLAUDE_AI,
                    subscriptionType: "max"
                })
            )
        ]);
        const harness = new GlmHarness({
            runner,
            environment: testEnvironment(),
            resolveCodingPlan: async () => GlmTestCodingPlan
        });

        await expect(harness.preflight()).rejects.toBeInstanceOf(HarnessCapabilityError);
        expect(runner.spawnRequests).toHaveLength(0);
    });
});
