import { afterEach, describe, expect, it } from "vitest";
import {
    HarnessAuthenticationMethods,
    HarnessExecutionProfiles,
    HarnessKinds,
    HarnessRunStatuses
} from "#src/agent-harness/agent-harness.const";
import { HarnessEventTypes } from "#src/agent-harness/harness-event.const";
import { ClaudePermissionModes } from "#src/claude-cli/claude-cli.const";
import { ClaudeHarness } from "#src/claude-cli/claude-harness";
import {
    captureSuccess,
    FakeHarnessProcessRunner,
    streamSuccess
} from "#src/cli-execution/cli-process-runner.fixture";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import { testEnvironment } from "#src/cli-execution/subscription-environment.fixture";
import {
    answerSchema,
    harnessRequest,
    lastCompleted,
    removeHarnessRunDirectories
} from "#src/subscription-cli-harness/harness-run.fixture";

const ClaudeTestNativeEventTypes = {
    SYSTEM: "system",
    STREAM_EVENT: "stream_event",
    ASSISTANT: "assistant",
    RESULT: "result"
} as const;

const ClaudeTestNativeSubtypes = {
    INIT: "init"
} as const;

const ClaudeTestContentBlockTypes = {
    TEXT: "text"
} as const;

const ClaudeTestStreamEventTypes = {
    CONTENT_BLOCK_DELTA: "content_block_delta",
    TEXT_DELTA: "text_delta"
} as const;

const ClaudeTestResultSubtypes = {
    SUCCESS: "success"
} as const;

const ClaudeTestApiProviders = {
    FIRST_PARTY: "firstParty",
    BEDROCK: "bedrock"
} as const;

const ClaudeTestSubscriptionTypes = {
    MAX: "max"
} as const;

const ClaudeTestCliValues = {
    VERSION: "2.1.220 (Claude Code)",
    STREAM_JSON: "stream-json"
} as const;

afterEach(removeHarnessRunDirectories);

describe("ClaudeHarness", () => {
    it("requires claude.ai auth, builds stream-json, and parses structured output", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(ClaudeTestCliValues.VERSION),
            captureSuccess(
                JSON.stringify({
                    loggedIn: true,
                    authMethod: HarnessAuthenticationMethods.CLAUDE_AI,
                    apiProvider: ClaudeTestApiProviders.FIRST_PARTY,
                    subscriptionType: ClaudeTestSubscriptionTypes.MAX
                })
            )
        ]);
        runner.nextStream = streamSuccess([
            {
                type: ClaudeTestNativeEventTypes.SYSTEM,
                subtype: ClaudeTestNativeSubtypes.INIT,
                session_id: "claude-session"
            },
            {
                type: ClaudeTestNativeEventTypes.STREAM_EVENT,
                session_id: "claude-session",
                event: {
                    type: ClaudeTestStreamEventTypes.CONTENT_BLOCK_DELTA,
                    delta: { type: ClaudeTestStreamEventTypes.TEXT_DELTA, text: "forty" }
                }
            },
            {
                type: ClaudeTestNativeEventTypes.ASSISTANT,
                session_id: "claude-session",
                message: {
                    content: [{ type: ClaudeTestContentBlockTypes.TEXT, text: "forty-two" }]
                }
            },
            {
                type: ClaudeTestNativeEventTypes.RESULT,
                subtype: ClaudeTestResultSubtypes.SUCCESS,
                is_error: false,
                session_id: "claude-session",
                structured_output: { answer: 42 },
                usage: { input_tokens: 8, output_tokens: 3, cache_read_input_tokens: 1 }
            }
        ]);
        const harness = new ClaudeHarness({ runner, environment: testEnvironment() });
        const request = await harnessRequest("claude-run", {
            responseSchema: answerSchema()
        });

        const events = await Array.fromAsync(harness.run(request));
        const spawn = runner.spawnRequests[0];
        const completed = lastCompleted(events);

        expect(ClaudePermissionModes.BYPASS_PERMISSIONS).toBeDefined();
        expect(runner.captureRequests.map((capture) => capture.args)).toEqual([
            ["--version"],
            ["--setting-sources", "", "auth", "status", "--json"]
        ]);
        expect(spawn?.args).toEqual([
            "-p",
            "--output-format",
            ClaudeTestCliValues.STREAM_JSON,
            "--verbose",
            "--include-partial-messages",
            "--dangerously-skip-permissions",
            "--permission-mode",
            ClaudePermissionModes.BYPASS_PERMISSIONS,
            "--setting-sources",
            "",
            "--settings",
            expect.stringContaining('"PreToolUse"'),
            "--json-schema",
            JSON.stringify(answerSchema())
        ]);
        expect(spawn?.args).not.toContain("--fallback-model");
        expect(spawn?.input).toBe(request.prompt);
        expect(events).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: HarnessEventTypes.ASSISTANT_DELTA,
                    text: "forty"
                }),
                expect.objectContaining({
                    type: HarnessEventTypes.ASSISTANT_COMPLETED,
                    text: "forty-two"
                }),
                expect.objectContaining({
                    type: HarnessEventTypes.STRUCTURED_OUTPUT,
                    value: { answer: 42 }
                })
            ])
        );
        expect(completed.result).toMatchObject({
            kind: HarnessKinds.CLAUDE,
            status: HarnessRunStatuses.SUCCEEDED,
            authentication: {
                method: HarnessAuthenticationMethods.CLAUDE_AI,
                subscription: ClaudeTestSubscriptionTypes.MAX
            },
            sessionId: "claude-session"
        });
    });

    it("rejects non-subscription and third-party auth JSON", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(ClaudeTestCliValues.VERSION),
            captureSuccess(
                JSON.stringify({
                    loggedIn: true,
                    authMethod: HarnessAuthenticationMethods.CLAUDE_AI,
                    apiProvider: ClaudeTestApiProviders.BEDROCK,
                    subscriptionType: ClaudeTestSubscriptionTypes.MAX
                })
            )
        ]);
        const harness = new ClaudeHarness({ runner, environment: testEnvironment() });

        await expect(harness.preflight()).rejects.toBeInstanceOf(HarnessCapabilityError);
        expect(runner.spawnRequests).toHaveLength(0);
    });

    it("uses native plan mode without permission bypass for read-only analysis", async () => {
        const runner = new FakeHarnessProcessRunner([
            captureSuccess(ClaudeTestCliValues.VERSION),
            captureSuccess(
                JSON.stringify({
                    loggedIn: true,
                    authMethod: HarnessAuthenticationMethods.CLAUDE_AI,
                    apiProvider: ClaudeTestApiProviders.FIRST_PARTY,
                    subscriptionType: ClaudeTestSubscriptionTypes.MAX
                })
            )
        ]);
        runner.nextStream = streamSuccess([
            {
                type: ClaudeTestNativeEventTypes.SYSTEM,
                subtype: ClaudeTestNativeSubtypes.INIT,
                session_id: "read-only-session"
            },
            {
                type: ClaudeTestNativeEventTypes.RESULT,
                subtype: ClaudeTestResultSubtypes.SUCCESS,
                is_error: false,
                session_id: "read-only-session"
            }
        ]);
        const harness = new ClaudeHarness({ runner, environment: testEnvironment() });

        await Array.fromAsync(
            harness.run(
                await harnessRequest("claude-read-only", {
                    executionProfile: HarnessExecutionProfiles.READ_ONLY
                })
            )
        );

        const args = runner.spawnRequests[0]?.args ?? [];
        expect(args).toEqual(
            expect.arrayContaining(["--permission-mode", ClaudePermissionModes.PLAN])
        );
        expect(args).not.toContain("--dangerously-skip-permissions");
    });
});
