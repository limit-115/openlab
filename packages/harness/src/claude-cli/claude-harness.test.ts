import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
    HarnessAuthenticationMethods,
    HarnessEffortLevels,
    HarnessExecutionProfiles,
    HarnessKinds,
    HarnessRunStatuses
} from "#src/agent-harness/agent-harness.const";
import { HarnessEventTypes, HarnessToolPhases } from "#src/agent-harness/harness-event.const";
import { ClaudePermissionModes, ClaudeSessionDefaults } from "#src/claude-cli/claude-cli.const";
import { ClaudeHarness } from "#src/claude-cli/claude-harness";
import {
    AnswerJsonSchema,
    answerSchema,
    harnessRequest,
    lastCompleted,
    removeHarnessRunDirectories
} from "#src/cli-agent-harness/harness-run.fixture";
import {
    captureSuccess,
    FakeHarnessProcessRunner,
    streamSuccess
} from "#src/cli-execution/cli-process-runner.fixture";
import { testEnvironment } from "#src/cli-execution/harness-environment.fixture";
import { HarnessCapabilityError } from "#src/cli-execution/harness-error";
import {
    removeSessionStores,
    sessionStoreRootDirectory,
    writeClaudeSession
} from "#src/session-transcript/session-store.fixture";
import { SessionTranscriptGaps } from "#src/session-transcript/session-transcript.const";

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
    TEXT: "text",
    TOOL_USE: "tool_use"
} as const;

const ClaudeTestStreamEventTypes = {
    CONTENT_BLOCK_DELTA: "content_block_delta",
    TEXT_DELTA: "text_delta",
    INPUT_JSON_DELTA: "input_json_delta"
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
afterEach(removeSessionStores);

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
            "--model",
            ClaudeSessionDefaults.MODEL,
            "--effort",
            ClaudeSessionDefaults.EFFORT,
            "--json-schema",
            expect.any(String)
        ]);
        expect(JSON.parse(String(spawn?.args.at(-1)))).toEqual(AnswerJsonSchema);
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
            session: {
                model: ClaudeSessionDefaults.MODEL,
                effort: ClaudeSessionDefaults.EFFORT
            },
            sessionId: "claude-session"
        });
    });

    it("reports the tool an agent called, not the fragments of its arguments", async () => {
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
                session_id: "tool-session"
            },
            ...['{"comm', 'and": "pnpm', ' vitest run"}'].map((partial_json) => ({
                type: ClaudeTestNativeEventTypes.STREAM_EVENT,
                session_id: "tool-session",
                event: {
                    type: ClaudeTestStreamEventTypes.CONTENT_BLOCK_DELTA,
                    delta: { type: ClaudeTestStreamEventTypes.INPUT_JSON_DELTA, partial_json }
                }
            })),
            {
                type: ClaudeTestNativeEventTypes.ASSISTANT,
                session_id: "tool-session",
                message: {
                    content: [
                        {
                            type: ClaudeTestContentBlockTypes.TOOL_USE,
                            id: "toolu_01",
                            name: "Bash",
                            input: { command: "pnpm vitest run" }
                        }
                    ]
                }
            },
            {
                type: ClaudeTestNativeEventTypes.RESULT,
                subtype: ClaudeTestResultSubtypes.SUCCESS,
                is_error: false,
                session_id: "tool-session"
            }
        ]);
        const harness = new ClaudeHarness({ runner, environment: testEnvironment() });

        const events = await Array.fromAsync(harness.run(await harnessRequest("claude-tool")));
        const tools = events.filter((event) => event.type === HarnessEventTypes.TOOL);

        expect(tools).toEqual([
            expect.objectContaining({
                toolName: "Bash",
                callId: "toolu_01",
                phase: HarnessToolPhases.STARTED
            })
        ]);
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

    it("lets a request override the default model and effort", async () => {
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
                session_id: "override-session"
            },
            {
                type: ClaudeTestNativeEventTypes.RESULT,
                subtype: ClaudeTestResultSubtypes.SUCCESS,
                is_error: false,
                session_id: "override-session"
            }
        ]);
        const harness = new ClaudeHarness({ runner, environment: testEnvironment() });

        await Array.fromAsync(
            harness.run(
                await harnessRequest("claude-override", {
                    model: "opus",
                    effort: HarnessEffortLevels.XHIGH
                })
            )
        );

        const args = runner.spawnRequests[0]?.args ?? [];

        expect(args).toEqual(
            expect.arrayContaining(["--model", "opus", "--effort", HarnessEffortLevels.XHIGH])
        );
        expect(args).not.toContain(ClaudeSessionDefaults.MODEL);
    });

    /**
     * The whole point of the collection: a delegated agent's working record reaches the stream only
     * in part, and which part differs from one run to the next. The manifest is what an operator
     * reads a finished run out of, so it has to name the transcript rather than the stream alone.
     */
    it("records the subagent transcripts the stream never carried in the manifest", async () => {
        const storeRoot = await sessionStoreRootDirectory();
        await writeClaudeSession(storeRoot, "-openlab-workspaces-cycle-1", "delegating-session");
        const harness = new ClaudeHarness({
            runner: subagentRunner(),
            environment: { ...testEnvironment(), CLAUDE_CONFIG_DIR: storeRoot }
        });

        const events = await Array.fromAsync(
            harness.run(await harnessRequest("claude-delegating"))
        );
        const { artifacts } = lastCompleted(events).result;
        const manifest = JSON.parse(await readFile(artifacts.manifest.path, "utf8"));

        expect(artifacts.session.source).toBe(storeRoot);
        expect(artifacts.session.files.map((file) => file.path)).toEqual(
            manifest.artifacts.session.files.map((file: { path: string }) => file.path)
        );
        expect(
            artifacts.session.files.filter((file) => file.path.includes("subagents"))
        ).toHaveLength(2);
    });

    /**
     * A store the run cannot be found in is a fact about the run, not an empty field. An operator
     * reading a manifest has to be able to tell "this CLI delegated to nobody" from "the lab lost
     * what it delegated to", and only one of those is something to go and fix.
     */
    it("states why a run holds no transcript rather than leaving the field empty", async () => {
        const harness = new ClaudeHarness({
            runner: subagentRunner(),
            environment: {
                ...testEnvironment(),
                CLAUDE_CONFIG_DIR: await sessionStoreRootDirectory()
            }
        });

        const events = await Array.fromAsync(harness.run(await harnessRequest("claude-no-store")));

        expect(lastCompleted(events).result.artifacts.session).toMatchObject({
            gap: SessionTranscriptGaps.NOT_FOUND,
            files: []
        });
    });
});

/** A CLI that reports a session and finishes, which is all a transcript collection needs of it. */
function subagentRunner(): FakeHarnessProcessRunner {
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
            session_id: "delegating-session"
        },
        {
            type: ClaudeTestNativeEventTypes.RESULT,
            subtype: ClaudeTestResultSubtypes.SUCCESS,
            is_error: false,
            session_id: "delegating-session"
        }
    ]);
    return runner;
}
