import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
    HarnessAuthenticationMethods,
    HarnessEffortLevels,
    HarnessExecutionProfiles,
    HarnessKinds,
    HarnessRunStatuses,
    HarnessTimeoutMilliseconds
} from "#src/agent-harness/agent-harness.const";
import { HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import type { HarnessEvent } from "#src/agent-harness/harness-event.types";
import {
    captureSuccess,
    FakeHarnessProcessRunner,
    streamFailure,
    streamSuccess
} from "#src/cli-execution/cli-process-runner.fixture";
import { HarnessErrorCodes } from "#src/cli-execution/harness-error.const";
import { testEnvironment } from "#src/cli-execution/subscription-environment.fixture";
import {
    CodexColorModes,
    CodexPermissionModes,
    CodexSessionDefaults
} from "#src/codex-cli/codex-cli.const";
import {
    CodexTestCliValues,
    CodexTestItemTypes,
    CodexTestLoginMarkers,
    CodexTestNativeEventTypes,
    CodexTestUsageLimitMessage
} from "#src/codex-cli/codex-cli.fixture";
import { CodexHarness } from "#src/codex-cli/codex-harness";
import {
    answerSchema,
    harnessRequest,
    lastCompleted,
    removeHarnessRunDirectories
} from "#src/subscription-cli-harness/harness-run.fixture";

afterEach(removeHarnessRunDirectories);

describe("CodexHarness", () => {
    it("builds a subscription-only structured exec command and normalizes JSONL", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            { ...captureSuccess(""), stderr: CodexTestLoginMarkers.CHATGPT }
        ]);
        runner.nextStream = streamSuccess([
            {
                type: CodexTestNativeEventTypes.THREAD_STARTED,
                thread_id: "codex-session"
            },
            {
                type: CodexTestNativeEventTypes.ITEM_COMPLETED,
                item: {
                    id: "message-1",
                    type: CodexTestItemTypes.AGENT_MESSAGE,
                    text: '{"answer":42}'
                }
            },
            {
                type: CodexTestNativeEventTypes.TURN_COMPLETED,
                usage: { input_tokens: 10, output_tokens: 4, cached_input_tokens: 2 }
            }
        ]);
        const environment = testEnvironment();
        const harness = new CodexHarness({ runner, environment });
        const request = await harnessRequest("codex-run", {
            responseSchema: answerSchema()
        });

        const events = await Array.fromAsync(harness.run(request));
        const spawn = runner.spawnRequests[0];
        const completed = lastCompleted(events);

        expect(CodexPermissionModes.UNRESTRICTED).toBeDefined();
        expect(runner.captureRequests.map((capture) => capture.args)).toEqual([
            ["--version"],
            ["login", "status"]
        ]);
        expect(spawn?.args).toEqual([
            "exec",
            "--color",
            CodexTestCliValues.COLOR_NEVER,
            "--json",
            "--ignore-user-config",
            "--skip-git-repo-check",
            "--dangerously-bypass-approvals-and-sandbox",
            "--model",
            CodexSessionDefaults.MODEL,
            "--config",
            `model_reasoning_effort="${CodexSessionDefaults.EFFORT}"`,
            "--output-schema",
            expect.stringMatching(/response-schema\.json$/),
            "-"
        ]);
        expect(spawn?.input).toBe(request.prompt);
        expect(spawn?.environment.PATH).toBe("/test/bin");
        expect(spawn?.environment.OPENAI_API_KEY).toBeUndefined();
        expect(spawn?.environment.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: HarnessEventTypes.SESSION_STARTED,
                    sessionId: "codex-session"
                }),
                expect.objectContaining({
                    type: HarnessEventTypes.STRUCTURED_OUTPUT,
                    value: { answer: 42 }
                }),
                expect.objectContaining({
                    type: HarnessEventTypes.USAGE,
                    inputTokens: 10,
                    outputTokens: 4,
                    cachedInputTokens: 2
                })
            ])
        );
        expect(completed.result).toMatchObject({
            kind: HarnessKinds.CODEX,
            status: HarnessRunStatuses.SUCCEEDED,
            cliVersion: CodexTestCliValues.VERSION,
            authentication: {
                method: HarnessAuthenticationMethods.CHATGPT,
                subscription: null
            },
            session: {
                model: CodexSessionDefaults.MODEL,
                effort: CodexSessionDefaults.EFFORT
            },
            sessionId: "codex-session",
            structuredOutput: { answer: 42 },
            exitCode: 0,
            timeoutMs: HarnessTimeoutMilliseconds.RUN
        });
        await expect(
            readFile(completed.result.artifacts.nativeEvents.path, "utf8")
        ).resolves.toContain(CodexTestNativeEventTypes.THREAD_STARTED);
        await expect(readFile(completed.result.artifacts.manifest.path, "utf8")).resolves.toContain(
            `"status": "${HarnessRunStatuses.SUCCEEDED}"`
        );
    });

    /** argv is readable by every process on the machine, so the prompt travels by stdin instead. */
    it("states the whole command line and hands the prompt over on stdin", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            captureSuccess(CodexTestLoginMarkers.CHATGPT)
        ]);
        runner.nextStream = streamSuccess([
            {
                type: CodexTestNativeEventTypes.THREAD_STARTED,
                thread_id: "argv-session"
            },
            {
                type: CodexTestNativeEventTypes.ITEM_COMPLETED,
                item: {
                    id: "message-2",
                    type: CodexTestItemTypes.AGENT_MESSAGE,
                    text: "answered"
                }
            }
        ]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("codex-argv", {
            model: "gpt-subscription-model",
            effort: HarnessEffortLevels.XHIGH
        });

        await Array.fromAsync(harness.run(request));

        expect(runner.spawnRequests[0]?.args).toEqual([
            "exec",
            "--color",
            CodexColorModes.NEVER,
            "--json",
            "--ignore-user-config",
            "--skip-git-repo-check",
            "--dangerously-bypass-approvals-and-sandbox",
            "--model",
            "gpt-subscription-model",
            "--config",
            `model_reasoning_effort="${HarnessEffortLevels.XHIGH}"`,
            "-"
        ]);
        expect(runner.spawnRequests[0]?.input).toBe(request.prompt);
    });

    it("uses the native read-only sandbox without dangerous bypass flags", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            captureSuccess(CodexTestLoginMarkers.CHATGPT)
        ]);
        runner.nextStream = streamSuccess([
            {
                type: CodexTestNativeEventTypes.THREAD_STARTED,
                thread_id: "read-only-session"
            },
            {
                type: CodexTestNativeEventTypes.ITEM_COMPLETED,
                item: {
                    id: "message-read-only",
                    type: CodexTestItemTypes.AGENT_MESSAGE,
                    text: "analysis"
                }
            }
        ]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });

        await Array.fromAsync(
            harness.run(
                await harnessRequest("codex-read-only", {
                    executionProfile: HarnessExecutionProfiles.READ_ONLY
                })
            )
        );

        const args = runner.spawnRequests[0]?.args ?? [];
        expect(args).toEqual(expect.arrayContaining(["--sandbox", CodexPermissionModes.READ_ONLY]));
        expect(args).not.toContain("--dangerously-bypass-approvals-and-sandbox");
    });

    it("rejects API-key authentication instead of falling back", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            captureSuccess(CodexTestLoginMarkers.API_KEY)
        ]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });

        await expect(harness.preflight()).rejects.toMatchObject({
            code: HarnessErrorCodes.SUBSCRIPTION_AUTH_REQUIRED,
            harness: HarnessKinds.CODEX,
            capabilityRequest: {
                need: expect.stringContaining("ChatGPT")
            }
        });
        expect(runner.spawnRequests).toHaveLength(0);
    });

    it("blames the spent subscription rather than the truncated event stream", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(CodexTestCliValues.VERSION),
            { ...captureSuccess(""), stderr: CodexTestLoginMarkers.CHATGPT }
        ]);
        runner.nextStream = streamFailure([
            {
                type: CodexTestNativeEventTypes.THREAD_STARTED,
                thread_id: "codex-session"
            },
            {
                type: CodexTestNativeEventTypes.ERROR,
                message: CodexTestUsageLimitMessage
            }
        ]);
        const harness = new CodexHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("codex-usage-limit", {
            responseSchema: answerSchema()
        });
        const events: HarnessEvent[] = [];

        const drain = async () => {
            for await (const event of harness.run(request)) {
                events.push(event);
            }
        };

        await expect(drain()).rejects.toMatchObject({
            code: HarnessErrorCodes.SUBSCRIPTION_AUTH_REQUIRED,
            harness: HarnessKinds.CODEX,
            capabilityRequest: { reason: CodexTestUsageLimitMessage }
        });
        const completed = lastCompleted(events);
        expect(completed.result.status).toBe(HarnessRunStatuses.FAILED);
        expect(completed.result.error).toContain("subscription usage limit reached");
    });
});
